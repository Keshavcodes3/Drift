import { bottleRepository } from "../repositories/bottle.repository";
import { ApiError } from "../../../common/errors/api.error";
import { StatusCodes } from "http-status-codes";
import {
  IBottle,
  BottleStatus,
  BottleMood,
  DeliveryType,
  CreateBottleInput,
  UpdateBottleInput,
  BottleResponse,
  BottleListItem,
  PaginatedBottlesResponse,
} from "../bottles.types";
import { Types } from "mongoose";

class BottleService {
  async createBottle(
    userId: string,
    input: CreateBottleInput
  ): Promise<BottleResponse> {
    // Validate message length
    if (!input.message || input.message.trim().length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Message cannot be empty");
    }
    
    if (input.message.length > 5000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Message cannot exceed 5000 characters"
      );
    }
    
    // Validate tags count
    if (input.tags && input.tags.length > 10) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot have more than 10 tags"
      );
    }
    
    // Set delivery time based on delivery type
    let deliveryTime = null;
    if (input.deliveryType === DeliveryType.DELAYED) {
      // Default to 24 hours from now for delayed delivery
      deliveryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (input.deliveryType === DeliveryType.SCHEDULED && input.deliveryTime) {
      deliveryTime = input.deliveryTime;
    }
    
    const bottleData = {
      sender: new Types.ObjectId(userId),
      message: input.message.trim(),
      mood: input.mood,
      isAnonymous: input.isAnonymous || false,
      deliveryType: input.deliveryType,
      deliveryTime,
      status: BottleStatus.DRAFT,
      tags: input.tags || [],
    };
    
    const bottle = await bottleRepository.create(bottleData);
    return this.formatBottleResponse(bottle);
  }

  async saveDraft(
    userId: string,
    input: CreateBottleInput
  ): Promise<BottleResponse> {
    return this.createBottle(userId, input);
  }

  async updateDraft(
    bottleId: string,
    userId: string,
    input: UpdateBottleInput
  ): Promise<BottleResponse> {
    const bottle = await bottleRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Check ownership
    if (bottle.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to update this bottle"
      );
    }
    
    // Only draft bottles can be updated
    if (bottle.status !== BottleStatus.DRAFT) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot update a ${bottle.status} bottle`
      );
    }
    
    // Validate message length if provided
    if (input.message && input.message.length > 5000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Message cannot exceed 5000 characters"
      );
    }
    
    // Validate tags count if provided
    if (input.tags && input.tags.length > 10) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot have more than 10 tags"
      );
    }
    
    // Prepare update data
    const updateData: Partial<IBottle> = {};
    
    if (input.message !== undefined) {
      updateData.message = input.message.trim();
    }
    
    if (input.mood !== undefined) {
      updateData.mood = input.mood;
    }
    
    if (input.isAnonymous !== undefined) {
      updateData.isAnonymous = input.isAnonymous;
    }
    
    if (input.deliveryType !== undefined) {
      updateData.deliveryType = input.deliveryType;
      
      // Update delivery time if delivery type changes
      if (input.deliveryType === DeliveryType.DELAYED) {
        updateData.deliveryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (input.deliveryType === DeliveryType.SCHEDULED && input.deliveryTime) {
        updateData.deliveryTime = input.deliveryTime;
      } else {
        updateData.deliveryTime = null;
      }
    }
    
    if (input.tags !== undefined) {
      updateData.tags = input.tags;
    }
    
    const updatedBottle = await bottleRepository.update(bottleId, updateData);
    
    if (!updatedBottle) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update bottle");
    }
    
    return this.formatBottleResponse(updatedBottle);
  }

  async deleteDraft(bottleId: string, userId: string): Promise<void> {
    const bottle = await bottleRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Check ownership
    if (bottle.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to delete this bottle"
      );
    }
    
    // Only draft bottles can be deleted
    if (bottle.status !== BottleStatus.DRAFT) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot delete a ${bottle.status} bottle`
      );
    }
    
    await bottleRepository.delete(bottleId);
  }

  async throwBottle(bottleId: string, userId: string): Promise<BottleResponse> {
    const bottle = await bottleRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Check ownership
    if (bottle.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to throw this bottle"
      );
    }
    
    // Only draft bottles can be thrown
    if (bottle.status !== BottleStatus.DRAFT) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot throw a ${bottle.status} bottle`
      );
    }
    
    // Set delivery time based on delivery type
    let deliveryTime = null;
    if (bottle.deliveryType === DeliveryType.DELAYED) {
      deliveryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    } else if (bottle.deliveryType === DeliveryType.SCHEDULED && bottle.deliveryTime) {
      deliveryTime = bottle.deliveryTime;
    }
    
    const thrownBottle = await bottleRepository.throwBottle(bottleId, deliveryTime);
    
    if (!thrownBottle) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to throw bottle");
    }
    
    return this.formatBottleResponse(thrownBottle);
  }

  async getBottle(bottleId: string, userId: string): Promise<BottleResponse> {
    const bottle = await bottleRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Check if user is the sender or if bottle is public (thrown)
    if (bottle.sender.toString() !== userId && bottle.status === BottleStatus.DRAFT) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to view this bottle"
      );
    }
    
    return this.formatBottleResponse(bottle);
  }

  async getMyBottles(
    userId: string,
    status?: BottleStatus,
    limit: number = 10,
    page: number = 1
  ): Promise<PaginatedBottlesResponse> {
    const { bottles, total } = await bottleRepository.getMyBottles(
      userId,
      status,
      limit,
      page
    );
    
    return {
      bottles: bottles.map(this.formatBottleListItem),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async archiveBottle(bottleId: string, userId: string): Promise<BottleResponse> {
    const bottle = await bottleRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Check ownership
    if (bottle.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to archive this bottle"
      );
    }
    
    // Cannot archive a draft bottle (should be thrown first)
    if (bottle.status === BottleStatus.DRAFT) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot archive a draft bottle. Throw it first."
      );
    }
    
    // Cannot archive an already archived bottle
    if (bottle.status === BottleStatus.ARCHIVED) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Bottle is already archived"
      );
    }
    
    const archivedBottle = await bottleRepository.archiveBottle(bottleId);
    
    if (!archivedBottle) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to archive bottle");
    }
    
    return this.formatBottleResponse(archivedBottle);
  }

  async favoriteBottle(bottleId: string, userId: string): Promise<BottleResponse> {
    const bottle = await bottleRepository.findById(bottleId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Cannot favorite a draft bottle
    if (bottle.status === BottleStatus.DRAFT) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot favorite a draft bottle"
      );
    }
    
    const favoritedBottle = await bottleRepository.favoriteBottle(bottleId, userId);
    
    if (!favoritedBottle) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to favorite bottle");
    }
    
    return this.formatBottleResponse(favoritedBottle);
  }

  private formatBottleResponse(bottle: IBottle): BottleResponse {
    return {
      id: bottle._id.toString(),
      sender: bottle.sender.toString(),
      recipient: bottle.recipient ? bottle.recipient.toString() : null,
      message: bottle.message,
      mood: bottle.mood,
      status: bottle.status,
      isAnonymous: bottle.isAnonymous,
      deliveryType: bottle.deliveryType,
      deliveryTime: bottle.deliveryTime,
      openedAt: bottle.openedAt,
      repliedAt: bottle.repliedAt,
      archivedAt: bottle.archivedAt,
      favoriteCount: bottle.favoriteCount,
      passCount: bottle.passCount,
      tags: bottle.tags,
      createdAt: bottle.createdAt,
      updatedAt: bottle.updatedAt,
    };
  }

  private formatBottleListItem(bottle: IBottle): BottleListItem {
    return {
      id: bottle._id.toString(),
      mood: bottle.mood,
      status: bottle.status,
      isAnonymous: bottle.isAnonymous,
      deliveryType: bottle.deliveryType,
      deliveryTime: bottle.deliveryTime,
      favoriteCount: bottle.favoriteCount,
      createdAt: bottle.createdAt,
    };
  }
}

export const bottleService = new BottleService();