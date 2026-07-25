import { Types } from "mongoose";
import { BottleStatus, IBottle } from "../bottles/bottles.types";

// Queue names
export enum QueueName {
  BOTTLE_DELIVERY = "BottleDeliveryQueue",
  RETRY = "RetryQueue",
  EXPIRATION = "ExpirationQueue",
  CLEANUP = "CleanupQueue",
}

// Job types
export enum JobType {
  DELIVER = "deliver",
  RETRY = "retry",
  EXPIRE = "expire",
  CLEANUP = "cleanup",
}

// Job data interfaces
export interface BaseJobData {
  bottleId: string;
  attempt: number;
  userId: string;
  timestamp: Date;
}

export interface DeliveryJobData extends BaseJobData {
  type: JobType.DELIVER;
  deliveryTime: Date;
  previousRecipient?: string;
}

export interface RetryJobData extends BaseJobData {
  type: JobType.RETRY;
  error: string;
  delay: number;
}

export interface ExpirationJobData extends BaseJobData {
  type: JobType.EXPIRE;
  expireAt: Date;
}

export interface CleanupJobData extends BaseJobData {
  type: JobType.CLEANUP;
}

// Union type for all job data
export type JobData =
  | DeliveryJobData
  | RetryJobData
  | ExpirationJobData
  | CleanupJobData;

// Job result interface
export interface JobResult {
  success: boolean;
  bottleId: string;
  recipientId?: string;
  error?: string;
  nextJob?: {
    queue: QueueName;
    data: JobData;
    delay: number;
  };
}

// Recipient selection criteria
export interface RecipientCriteria {
  excludeUserIds: string[];
  preferredMood?: string;
  preferredLanguage?: string;
  preferredTags?: string[];
  minLastSeen?: Date;
  maxRecentMatches?: number;
}

// Delivery status
export enum DeliveryStatus {
  QUEUED = "queued",
  DRIFTING = "drifting",
  DELIVERED = "delivered",
  FAILED = "failed",
  RETRYING = "retrying",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

// Delivery metadata
export interface DeliveryMetadata {
  status: DeliveryStatus;
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  recipient?: string;
  deliveredAt?: Date;
  expiredAt?: Date;
  cancelledAt?: Date;
  error?: string;
}

// Extended bottle interface with delivery metadata
export interface IDriftBottle extends Omit<IBottle, "deliveryMetadata"> {
  deliveryMetadata: DeliveryMetadata;
}

// DTOs for API endpoints
export interface ScheduleDeliveryDto {
  bottleId: string;
  deliveryTime?: Date;
  forceImmediate?: boolean;
}

export interface RedriftDto {
  bottleId: string;
  reason: string;
}

export interface CancelDeliveryDto {
  bottleId: string;
  reason: string;
}

// Socket.IO events
export enum DriftSocketEvent {
  BOTTLE_QUEUED = "bottle:queued",
  BOTTLE_DELIVERED = "bottle:delivered",
  BOTTLE_OPENED = "bottle:opened",
  BOTTLE_EXPIRED = "bottle:expired",
  BOTTLE_REDRIFTED = "bottle:redrifted",
  BOTTLE_FAILED = "bottle:failed",
}

// Event types for internal event emitter
export enum DriftEvent {
  BOTTLE_QUEUED = "drift:bottle_queued",
  BOTTLE_DELIVERED = "drift:bottle_delivered",
  BOTTLE_EXPIRED = "drift:bottle_expired",
  BOTTLE_FAILED = "drift:bottle_failed",
  BOTTLE_RETRIED = "drift:bottle_retried",
  BOTTLE_OPENED = "drift:bottle_opened",
}

// Event payloads
export interface BottleQueuedEvent {
  bottleId: string;
  userId: string;
  deliveryTime: Date;
  jobId: string;
}

export interface BottleDeliveredEvent {
  bottleId: string;
  senderId: string;
  recipientId: string;
  deliveredAt: Date;
}

export interface BottleExpiredEvent {
  bottleId: string;
  expiredAt: Date;
}

export interface BottleFailedEvent {
  bottleId: string;
  error: string;
  attempt: number;
}

export interface BottleRetriedEvent {
  bottleId: string;
  attempt: number;
  nextAttempt: Date;
}

export interface BottleOpenedEvent {
  bottleId: string;
  userId: string;
  openedAt: Date;
}

// Union type for all events
export type DriftEventPayload =
  | BottleQueuedEvent
  | BottleDeliveredEvent
  | BottleExpiredEvent
  | BottleFailedEvent
  | BottleRetriedEvent
  | BottleOpenedEvent;

// Delivery status response
export interface DeliveryStatusResponse {
  bottleId: string;
  status: DeliveryStatus;
  recipient?: string;
  deliveredAt?: Date;
  expiredAt?: Date;
  cancelledAt?: Date;
  attempts: number;
  nextAttempt?: Date;
  error?: string;
  jobId?: string;
}