import { driftRepository } from "../repositories/drift.repository";
import { QueueName, JobType, JobData, JobResult, DeliveryStatus, RecipientCriteria, DeliveryStatusResponse } from "../drift.types";
import { ApiError } from "../../../common/errors/api.error";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { BottleStatus } from "../../bottles/bottles.types";
import { userService } from "../../users/services/user.service";
import { bottleService } from "../../bottles/services/bottle.service";
import { EventEmitter } from "events";
import { Redis } from "ioredis";
import type { DeliveryJobData, ExpirationJobData, RetryJobData } from "../drift.types.js";

class DriftService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 10000]; // 1s, 5s, 10s
  private readonly EXPIRATION_DELAY = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly DRIFT_DELAY_RANGE = {
    min: 5 * 60 * 1000, // 5 minutes
    max: 24 * 60 * 60 * 1000, // 24 hours
  };

  constructor(
    private queueManager: {
      add: (
        queueName: QueueName,
        data: JobData,
        opts?: { delay: number; jobId?: string }
      ) => Promise<string>;
      remove: (queueName: QueueName, jobId: string) => Promise<void>;
      getJob: (queueName: QueueName, jobId: string) => Promise<any>;
    },
    private eventEmitter: EventEmitter,
    private redis: Redis,
    private logger: typeof console
  ) {}

  async scheduleDelivery(
    bottleId: string,
    userId: string,
    deliveryTime?: Date,
    forceImmediate = false
  ): Promise<DeliveryStatusResponse> {
    const bottle = await driftRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }

    if (bottle.status !== BottleStatus.THROWN) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot schedule delivery for a bottle in ${bottle.status} status`
      );
    }
    
    const calculatedDeliveryTime = this.calculateDeliveryTime(
      deliveryTime,
      forceImmediate
    );
    
    const jobId = `deliver_${bottleId}_${Date.now()}`;
    
    // Queue the bottle
    const queuedBottle = await driftRepository.queueBottle(
      bottleId,
      calculatedDeliveryTime,
      jobId
    );
    
    if (!queuedBottle) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to queue bottle"
      );
    }
    
    // Add job to queue
    const delay = calculatedDeliveryTime.getTime() - Date.now();
    
    await this.queueManager.add(
      QueueName.BOTTLE_DELIVERY,
      {
        type: JobType.DELIVER,
        bottleId,
        userId,
        attempt: 0,
        timestamp: new Date(),
        deliveryTime: calculatedDeliveryTime,
      } as JobData,
      { delay: delay > 0 ? delay : 0, jobId }
    );
    
    // Emit event
    this.eventEmitter.emit("drift:bottle_queued", {
      bottleId,
      userId,
      deliveryTime: calculatedDeliveryTime,
      jobId,
    });
    
    // Return status
    return this.getDeliveryStatus(bottleId);
  }

  async processDelivery(jobData: JobData): Promise<JobResult> {
    const { bottleId, userId, attempt } = jobData;
    
    try {
      const bottle = await driftRepository.findById(bottleId);
      
      if (!bottle) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
      }
      
      // Check if bottle is still in a deliverable state
      if (
        bottle.status !== BottleStatus.THROWN &&
        bottle.deliveryMetadata.status !== DeliveryStatus.QUEUED
      ) {
        this.logger.warn(
          `Bottle ${bottleId} is no longer eligible for delivery. Current status: ${bottle.status}`
        );
        return {
          success: false,
          bottleId,
          error: "Bottle no longer eligible for delivery",
        };
      }
      
      // Find recipient
      const recipient = await this.selectRecipient(bottleId, userId);
      
      if (!recipient) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "No suitable recipient found"
        );
      }
      
      // Update bottle with recipient and mark as drifting
      const updatedBottle = await driftRepository.assignRecipient(
        bottleId,
        recipient._id.toString(),
        new Date() // Deliver immediately since we found a recipient
      );
      
      if (!updatedBottle) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to assign recipient"
        );
      }
      
      // Emit event
      this.eventEmitter.emit("drift:bottle_delivered", {
        bottleId,
        senderId: userId,
        recipientId: recipient._id.toString(),
        deliveredAt: new Date(),
      });
      
      return {
        success: true,
        bottleId,
        recipientId: recipient._id.toString(),
      };
    } catch (error) {
      this.logger.error(
        `Delivery attempt ${attempt + 1} failed for bottle ${bottleId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      
      if (attempt < this.MAX_RETRIES - 1) {
        // Schedule retry with exponential backoff
        const delay = this.RETRY_DELAYS[attempt];
        const nextAttempt = new Date(Date.now() + delay);
        
        // Update bottle with retry info
        await driftRepository.incrementRetryAttempt(bottleId, error.message);
        
        // Emit retry event
        this.eventEmitter.emit("drift:bottle_retried", {
          bottleId,
          attempt: attempt + 1,
          nextAttempt,
        });
        
        return {
          success: false,
          bottleId,
          error: error.message,
          nextJob: {
            queue: QueueName.RETRY,
            data: {
              type: JobType.RETRY,
              bottleId,
              userId,
              attempt: attempt + 1,
              timestamp: new Date(),
              error: error.message,
              delay,
            } as RetryJobData,
            delay,
          },
        };
      } else {
        // Max retries reached, move to dead letter queue
        await driftRepository.updateDeliveryStatus(bottleId, DeliveryStatus.FAILED, {
          attempts: this.MAX_RETRIES,
          lastAttempt: new Date(),
          error: error.message,
        });
        
        // Emit failed event
        this.eventEmitter.emit("drift:bottle_failed", {
          bottleId,
          error: error.message,
          attempt: this.MAX_RETRIES,
        });
        
        return {
          success: false,
          bottleId,
          error: error.message,
        };
      }
    }
  }

  async retryDelivery(jobData: RetryJobData): Promise<JobResult> {
    const { bottleId, userId, attempt, delay } = jobData;
    
    try {
      // Add the delivery job back to the queue
      const jobId = `retry_${bottleId}_${Date.now()}_${attempt}`;
      
      await this.queueManager.add(
        QueueName.BOTTLE_DELIVERY,
        {
          type: JobType.DELIVER,
          bottleId,
          userId,
          attempt,
          timestamp: new Date(),
          deliveryTime: new Date(Date.now() + delay),
        } as DeliveryJobData,
        { delay, jobId }
      );
      
      return {
        success: true,
        bottleId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reschedule delivery for bottle ${bottleId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      
      return {
        success: false,
        bottleId,
        error: error.message,
      };
    }
  }

  async expireBottle(jobData: ExpirationJobData): Promise<JobResult> {
    const { bottleId } = jobData;
    
    try {
      const bottle = await driftRepository.findById(bottleId);
      
      if (!bottle) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
      }
      
      // Mark bottle as expired
      const expiredBottle = await driftRepository.markExpired(
        bottleId,
        new Date()
      );
      
      if (!expiredBottle) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to expire bottle"
        );
      }
      
      // Emit event
      this.eventEmitter.emit("drift:bottle_expired", {
        bottleId,
        expiredAt: new Date(),
      });
      
      return {
        success: true,
        bottleId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to expire bottle ${bottleId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      
      return {
        success: false,
        bottleId,
        error: error.message,
      };
    }
  }

  async cancelDelivery(
    bottleId: string,
    userId: string,
    reason: string
  ): Promise<DeliveryStatusResponse> {
    const bottle = await driftRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Verify ownership
    if (bottle.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to cancel this delivery"
      );
    }
    
    // Check if bottle is in a cancellable state
    if (
      bottle.status !== BottleStatus.THROWN ||
      (bottle.deliveryMetadata.status !== DeliveryStatus.QUEUED &&
        bottle.deliveryMetadata.status !== DeliveryStatus.DRIFTING)
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot cancel delivery for a bottle in ${bottle.status} status`
      );
    }
    
    try {
      // Cancel any pending jobs
      if (bottle.deliveryMetadata.jobId) {
        await this.queueManager.remove(
          QueueName.BOTTLE_DELIVERY,
          bottle.deliveryMetadata.jobId
        );
      }
      
      // Mark bottle as cancelled
      const cancelledBottle = await driftRepository.markCancelled(
        bottleId,
        new Date()
      );
      
      if (!cancelledBottle) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to cancel delivery"
        );
      }
      
      return this.getDeliveryStatus(bottleId);
    } catch (error) {
      this.logger.error(
        `Failed to cancel delivery for bottle ${bottleId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to cancel delivery"
      );
    }
  }

  async redriftBottle(
    bottleId: string,
    userId: string,
    reason: string
  ): Promise<DeliveryStatusResponse> {
    const bottle = await driftRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Verify ownership
    if (bottle.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to redrift this bottle"
      );
    }
    
    // Check if bottle is in a redriftable state
    if (
      bottle.status !== BottleStatus.DELIVERED &&
      bottle.status !== BottleStatus.OPENED
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot redrift a bottle in ${bottle.status} status`
      );
    }
    
    try {
      // Reset recipient and delivery metadata
      const resetBottle = await driftRepository.updateDeliveryStatus(
        bottleId,
        DeliveryStatus.QUEUED,
        {
          attempts: 0,
          lastAttempt: null,
          nextAttempt: new Date(Date.now() + this.DRIFT_DELAY_RANGE.min),
          error: null,
          recipient: null,
        }
      );
      
      if (!resetBottle) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to reset bottle for redrift"
        );
      }
      
      // Create new job ID
      const jobId = `redrift_${bottleId}_${Date.now()}`;
      
      // Add to queue with random drift delay
      const driftDelay =
        Math.floor(
          Math.random() *
            (this.DRIFT_DELAY_RANGE.max - this.DRIFT_DELAY_RANGE.min) +
            this.DRIFT_DELAY_RANGE.min
        );
      
      await this.queueManager.add(
        QueueName.BOTTLE_DELIVERY,
        {
          type: JobType.DELIVER,
          bottleId,
          userId,
          attempt: 0,
          timestamp: new Date(),
          deliveryTime: new Date(Date.now() + driftDelay),
        } as DeliveryJobData,
        { delay: driftDelay, jobId }
      );
      
      // Emit event
      this.eventEmitter.emit("drift:bottle_redrifted", {
        bottleId,
        userId,
        reason,
      });
      
      return this.getDeliveryStatus(bottleId);
    } catch (error) {
      this.logger.error(
        `Failed to redrift bottle ${bottleId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to redrift bottle"
      );
    }
  }

  async getDeliveryStatus(
    bottleId: string
  ): Promise<DeliveryStatusResponse> {
    const status = await driftRepository.getDeliveryStatus(bottleId);
    
    if (!status) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    return status;
  }

  async selectRecipient(
    bottleId: string,
    senderId: string
  ): Promise<{ _id: Types.ObjectId; username: string }> {
    const bottle = await driftRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Get recently matched users from cache to exclude
    const recentMatchesKey = `user:${senderId}:recent_matches`;
    const recentMatches = await this.redis.smembers(recentMatchesKey);
    
    // Get blocked users from cache to exclude
    const blockedUsersKey = `user:${senderId}:blocked`;
    const blockedUsers = await this.redis.smembers(blockedUsersKey);
    
    // Get online users from cache
    const onlineUsersKey = "online_users";
    const onlineUsers = await this.redis.smembers(onlineUsersKey);
    
    // Build recipient criteria
    const criteria: RecipientCriteria = {
      excludeUserIds: [senderId, ...recentMatches, ...blockedUsers],
      preferredMood: bottle.mood,
      preferredTags: bottle.tags,
      minLastSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
      maxRecentMatches: 5, // Limit to 5 recent matches to exclude
    };
    
    // Find potential recipients
    const potentialRecipients = await this.findPotentialRecipients(criteria);
    
    if (potentialRecipients.length === 0) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "No suitable recipients found"
      );
    }
    
    // Select recipient using weighted random selection
    // Prioritize online users and users with matching mood/tags
    const recipient = this.weightedRandomSelection(
      potentialRecipients,
      criteria
    );
    
    // Add to recent matches cache
    if (recipient._id) {
      await this.redis.sadd(recentMatchesKey, recipient._id.toString());
      await this.redis.expire(recentMatchesKey, 30 * 24 * 60 * 60); // 30 days
    }
    
    return recipient;
  }

  private async findPotentialRecipients(
    criteria: RecipientCriteria
  ): Promise<{ _id: Types.ObjectId; username: string; mood?: string; tags?: string[]; lastSeen?: Date }[]> {
    // In a production environment, this would be a more sophisticated query
    // possibly using a recommendation engine or specialized matching service
    
    // For now, we'll use a simple query that:
    // 1. Excludes the sender and other excluded users
    // 2. Prioritizes active users
    // 3. Considers mood and tags for matching
    
    // Get all active users (simplified for example)
    const users = await userService.getActiveUsers(
      criteria.excludeUserIds,
      criteria.minLastSeen
    );
    
    // Filter and score users based on criteria
    return users
      .filter((user) => {
        // Basic filters
        return (
          !criteria.excludeUserIds.includes(user._id.toString()) &&
          (!criteria.minLastSeen || 
            (user.lastSeen && user.lastSeen >= criteria.minLastSeen))
        );
      })
      .map((user) => ({
        _id: user._id,
        username: user.username,
        mood: user.mood, // This would come from user profile in a real implementation
        tags: user.tags, // This would come from user profile in a real implementation
        lastSeen: user.lastSeen,
      }));
  }

  private weightedRandomSelection(
    recipients: {
      _id: Types.ObjectId;
      username: string;
      mood?: string;
      tags?: string[];
      lastSeen?: Date;
    }[],
    criteria: RecipientCriteria
  ): { _id: Types.ObjectId; username: string } {
    // Assign weights to each recipient based on matching criteria
    const weightedRecipients = recipients.map((recipient) => {
      let weight = 1; // Base weight
      
      // Increase weight for online users (simulated by recent lastSeen)
      if (recipient.lastSeen && recipient.lastSeen > new Date(Date.now() - 5 * 60 * 1000)) {
        weight *= 2; // Double weight for recently active users
      }
      
      // Increase weight for mood match
      if (criteria.preferredMood && recipient.mood === criteria.preferredMood) {
        weight *= 1.5;
      }
      
      // Increase weight for tag matches
      if (criteria.preferredTags && recipient.tags) {
        const matchingTags = criteria.preferredTags.filter((tag) =>
          recipient.tags!.includes(tag)
        );
        weight *= 1 + matchingTags.length * 0.2; // 20% boost per matching tag
      }
      
      return { ...recipient, weight };
    });
    
    // Calculate total weight
    const totalWeight = weightedRecipients.reduce((sum, r) => sum + r.weight, 0);
    
    // Select a random recipient based on weights
    let random = Math.random() * totalWeight;
    for (const recipient of weightedRecipients) {
      random -= recipient.weight;
      if (random <= 0) {
        return { _id: recipient._id, username: recipient.username };
      }
    }
    
    // Fallback to random selection if something went wrong with weighting
    return weightedRecipients[
      Math.floor(Math.random() * weightedRecipients.length)
    ];
  }

  private calculateDeliveryTime(
    deliveryTime?: Date,
    forceImmediate = false
  ): Date {
    if (forceImmediate) {
      return new Date(); // Deliver immediately
    }
    
    if (deliveryTime && deliveryTime > new Date()) {
      return deliveryTime; // Use provided future delivery time
    }
    
    // Default to random drift delay between 5 minutes and 24 hours
    return new Date(
      Date.now() +
        Math.floor(
          Math.random() *
            (this.DRIFT_DELAY_RANGE.max - this.DRIFT_DELAY_RANGE.min) +
            this.DRIFT_DELAY_RANGE.min
        )
    );
  }
}

export const driftService = new DriftService(
  // These would be injected by your DI container in a real application
  {
    add: async () => "", // Mock implementation
    remove: async () => {}, // Mock implementation
    getJob: async () => null, // Mock implementation
  } as any,
  new EventEmitter(),
  new (require("ioredis"))() as Redis, // Mock Redis
  console // Mock logger
);