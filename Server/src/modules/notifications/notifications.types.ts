import { Types } from "mongoose";

export enum NotificationType {
  BOTTLE_DELIVERED = "bottle_delivered",
  BOTTLE_OPENED = "bottle_opened",
  BOTTLE_REPLIED = "bottle_replied",
  NEW_MESSAGE = "new_message",
  SYSTEM = "system",
  WARNING = "warning",
  ADMIN = "admin",
  ACHIEVEMENT = "achievement",
  MENTION = "mention",
  FRIEND_REQUEST = "friend_request",
}


export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

export enum NotificationSocketEvent {
  NEW_NOTIFICATION = "notification:new",
  NOTIFICATION_READ = "notification:read",
  NOTIFICATION_DELETE = "notification:delete",
  NOTIFICATION_COUNT = "notification:count",
}

// Internal event names for event emitter
export enum NotificationEvent {
  NOTIFICATION_CREATED = "notification:created",
  NOTIFICATION_READ = "notification:read",
  NOTIFICATION_DELETED = "notification:deleted",
  NOTIFICATION_SENT = "notification:sent",
  NOTIFICATION_FAILED = "notification:failed",
}

// Metadata interfaces for different notification types
export interface BottleDeliveredMetadata {
  bottleId: string;
  senderId: string;
  senderUsername?: string;
  mood?: string;
}

export interface BottleOpenedMetadata {
  bottleId: string;
  openerId: string;
}

export interface BottleRepliedMetadata {
  bottleId: string;
  replierId: string;
  conversationId: string;
}

export interface NewMessageMetadata {
  conversationId: string;
  messageId: string;
  senderId: string;
  preview?: string;
}

export interface SystemMetadata {
  code: string;
  actionUrl?: string;
}

// Union type for all metadata
export type NotificationMetadata =
  | BottleDeliveredMetadata
  | BottleOpenedMetadata
  | BottleRepliedMetadata
  | NewMessageMetadata
  | SystemMetadata
  | Record<string, any>; // For future types

// Notification interface for database
export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  priority: NotificationPriority;
  status: NotificationStatus;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for API requests
export interface GetNotificationsDto {
  limit?: number;
  cursor?: string;
  type?: NotificationType | NotificationType[];
  status?: NotificationStatus | NotificationStatus[];
  isRead?: boolean;
}

// DTOs for API responses
export interface NotificationResponse {
  id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  priority: NotificationPriority;
  status: NotificationStatus;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Paginated response
export interface PaginatedNotificationsResponse {
  notifications: NotificationResponse[];
  hasMore: boolean;
  nextCursor: string | null;
  unreadCount: number;
}

// Event payloads
export interface NotificationCreatedEvent {
  notificationId: string;
  recipientId: string;
  type: NotificationType;
  priority: NotificationPriority;
  createdAt: Date;
}

export interface NotificationReadEvent {
  notificationId: string;
  recipientId: string;
  readAt: Date;
}

export interface NotificationDeletedEvent {
  notificationId: string;
  recipientId: string;
  deletedAt: Date;
}

// Redis cache keys
export enum CacheKey {
  UNREAD_COUNT = "notifications:unread:",
  RECENT_NOTIFICATIONS = "notifications:recent:",
  USER_SOCKETS = "notifications:sockets:",
}

// External event payloads (from other modules)
export interface BottleDeliveredEvent {
  bottleId: string;
  recipientId: string;
  senderId: string;
  senderUsername: string;
  mood: string;
  deliveredAt: Date;
}

export interface BottleOpenedEvent {
  bottleId: string;
  openerId: string;
  senderId: string;
  openedAt: Date;
}

export interface BottleRepliedEvent {
  bottleId: string;
  replierId: string;
  senderId: string;
  conversationId: string;
  repliedAt: Date;
}

export interface MessageSentEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  receiverId: string;
  preview: string;
  sentAt: Date;
}

export interface SystemEvent {
  recipientId: string | string[];
  type: "system" | "warning" | "admin";
  code: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
}

// Union type for all external events
export type ExternalEvent =
  | BottleDeliveredEvent
  | BottleOpenedEvent
  | BottleRepliedEvent
  | MessageSentEvent
  | SystemEvent;