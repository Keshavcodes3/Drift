import { notificationRepository } from "../repositories/notification.repository";
import { ApiError } from "../../../common/errors/api.error";
import { StatusCodes } from "http-status-codes";
import {
  INotification,
  NotificationResponse,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  PaginatedNotificationsResponse,
  NotificationSocketEvent,
  NotificationEvent,
  CacheKey,
  ExternalEvent,
  BottleDeliveredEvent,
  BottleOpenedEvent,
  BottleRepliedEvent,
  MessageSentEvent,
  SystemEvent,
} from "../notifications.types";
import { Types } from "mongoose";
import { EventEmitter } from "events";
import { Redis } from "ioredis";

class NotificationService {
  private readonly DEFAULT_PRIORITY: NotificationPriority = NotificationPriority.NORMAL;
  private readonly NOTIFICATION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(
    private eventEmitter: EventEmitter,
    private redis: Redis,
    private logger: typeof console
  ) {
    // Subscribe to internal events for real-time updates
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for notification events to emit via Socket.IO
    this.eventEmitter.on(
      NotificationEvent.NOTIFICATION_CREATED,
      this.handleNotificationCreated.bind(this)
    );
    
    this.eventEmitter.on(
      NotificationEvent.NOTIFICATION_READ,
      this.handleNotificationRead.bind(this)
    );
    
    this.eventEmitter.on(
      NotificationEvent.NOTIFICATION_DELETED,
      this.handleNotificationDeleted.bind(this)
    );
  }

  // Public methods for HTTP endpoints
  async getNotifications(
    userId: string,
    options: {
      limit?: number;
      cursor?: string;
      type?: NotificationType | NotificationType[];
      isRead?: boolean;
    } = {}
  ): Promise<PaginatedNotificationsResponse> {
    const { notifications, hasMore, nextCursor } =
      await notificationRepository.findByRecipient(new Types.ObjectId(userId), {
        limit: options.limit,
        cursor: options.cursor,
        type: options.type,
        isRead: options.isRead,
      });
    
    // Get unread count from cache or database
    const unreadCount = await this.getUnreadCount(userId);
    
    return {
      notifications: notifications.map(this.formatNotificationResponse),
      hasMore,
      nextCursor,
      unreadCount,
    };
  }

  async getNotification(
    userId: string,
    notificationId: string
  ): Promise<NotificationResponse> {
    const notification = await notificationRepository.findById(
      new Types.ObjectId(notificationId)
    );
    
    if (!notification) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
    }
    
    // Verify ownership
    if (notification.recipient.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to access this notification"
      );
    }
    
    return this.formatNotificationResponse(notification);
  }

  async markRead(
    userId: string,
    notificationId: string
  ): Promise<NotificationResponse> {
    const notification = await notificationRepository.findById(
      new Types.ObjectId(notificationId)
    );
    
    if (!notification) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
    }
    
    // Verify ownership
    if (notification.recipient.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to mark this notification as read"
      );
    }
    
    const updatedNotification = await notificationRepository.markRead(
      new Types.ObjectId(notificationId)
    );
    
    if (!updatedNotification) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to mark notification as read"
      );
    }
    
    // Update unread count in cache
    await this.updateUnreadCount(userId);
    
    // Emit event
    this.eventEmitter.emit(NotificationEvent.NOTIFICATION_READ, {
      notificationId: updatedNotification._id.toString(),
      recipientId: userId,
      readAt: updatedNotification.readAt!,
    });
    
    return this.formatNotificationResponse(updatedNotification);
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const count = await notificationRepository.markAllRead(
      new Types.ObjectId(userId)
    );
    
    // Update unread count in cache
    await this.updateUnreadCount(userId);
    
    // Emit count update event
    this.emitUnreadCount(userId);
    
    return { count };
  }

  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const notification = await notificationRepository.findById(
      new Types.ObjectId(notificationId)
    );
    
    if (!notification) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
    }
    
    // Verify ownership
    if (notification.recipient.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to delete this notification"
      );
    }
    
    await notificationRepository.delete(new Types.ObjectId(notificationId));
    
    // Update unread count in cache if the notification was unread
    if (!notification.isRead) {
      await this.updateUnreadCount(userId);
    }
    
    // Emit event
    this.eventEmitter.emit(NotificationEvent.NOTIFICATION_DELETED, {
      notificationId: notification._id.toString(),
      recipientId: userId,
      deletedAt: new Date(),
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Try to get from cache first
    const cacheKey = `${CacheKey.UNREAD_COUNT}${userId}`;
    const cachedCount = await this.redis.get(cacheKey);
    
    if (cachedCount) {
      return parseInt(cachedCount);
    }
    
    // Fall back to database
    const count = await notificationRepository.countUnread(
      new Types.ObjectId(userId)
    );
    
    // Cache the result
    await this.redis.setex(cacheKey, 60, count.toString()); // Cache for 60 seconds
    
    return count;
  }

  // Event handlers for domain events
  async handleBottleDelivered(event: BottleDeliveredEvent): Promise<void> {
    await this.createNotification({
      recipientId: event.recipientId,
      type: NotificationType.BOTTLE_DELIVERED,
      title: "New bottle delivered!",
      message: `You've received a new bottle from ${event.senderUsername} with a ${event.mood} mood!`,
      metadata: {
        bottleId: event.bottleId,
        senderId: event.senderId,
        senderUsername: event.senderUsername,
        mood: event.mood,
      },
      priority: NotificationPriority.HIGH,
    });
  }

  async handleBottleOpened(event: BottleOpenedEvent): Promise<void> {
    await this.createNotification({
      recipientId: event.senderId,
      type: NotificationType.BOTTLE_OPENED,
      title: "Your bottle was opened!",
      message: `Someone has opened your bottle! You can now start a conversation.`,
      metadata: {
        bottleId: event.bottleId,
        openerId: event.openerId,
      },
      priority: NotificationPriority.HIGH,
    });
  }

  async handleBottleReplied(event: BottleRepliedEvent): Promise<void> {
    // Notify the original sender
    await this.createNotification({
      recipientId: event.senderId,
      type: NotificationType.BOTTLE_REPLIED,
      title: "New reply to your bottle!",
      message: `Someone has replied to your bottle. Check your conversations!`,
      metadata: {
        bottleId: event.bottleId,
        replierId: event.replierId,
        conversationId: event.conversationId,
      },
      priority: NotificationPriority.HIGH,
    });
  }

  async handleMessageSent(event: MessageSentEvent): Promise<void> {
    // Don't notify the sender
    if (event.senderId === event.receiverId) return;
    
    await this.createNotification({
      recipientId: event.receiverId,
      type: NotificationType.NEW_MESSAGE,
      title: "New message!",
      message: event.preview || "You have a new message",
      metadata: {
        conversationId: event.conversationId,
        messageId: event.messageId,
        senderId: event.senderId,
        preview: event.preview,
      },
      priority: NotificationPriority.NORMAL,
    });
  }

  async handleSystemEvent(event: SystemEvent): Promise<void> {
    const recipients = Array.isArray(event.recipientId)
      ? event.recipientId
      : [event.recipientId];
    
    for (const recipientId of recipients) {
      await this.createNotification({
        recipientId,
        type: event.type === "system"
          ? NotificationType.SYSTEM
          : event.type === "warning"
          ? NotificationType.WARNING
          : NotificationType.ADMIN,
        title: event.title,
        message: event.message,
        metadata: {
          code: event.code,
          ...(event.actionUrl && { actionUrl: event.actionUrl }),
          ...event.metadata,
        },
        priority: event.priority || NotificationPriority.NORMAL,
      });
    }
  }

  // Core notification creation method
  private async createNotification(params: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata: any;
    priority?: NotificationPriority;
  }): Promise<INotification> {
    const notification = await notificationRepository.create({
      recipient: new Types.ObjectId(params.recipientId),
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata,
      priority: params.priority || this.DEFAULT_PRIORITY,
      status: NotificationStatus.PENDING,
      isRead: false,
    });
    
    // Update unread count in cache
    await this.updateUnreadCount(params.recipientId);
    
    // Emit event for real-time delivery
    this.eventEmitter.emit(NotificationEvent.NOTIFICATION_CREATED, {
      notificationId: notification._id.toString(),
      recipientId: params.recipientId,
      type: params.type,
      priority: notification.priority,
      createdAt: notification.createdAt,
    });
    
    return notification;
  }

  // Event handlers for notification events
  private async handleNotificationCreated(event: {
    notificationId: string;
    recipientId: string;
    type: NotificationType;
    priority: NotificationPriority;
    createdAt: Date;
  }): Promise<void> {
    // Get the notification from database
    const notification = await notificationRepository.findById(
      new Types.ObjectId(event.notificationId)
    );
    
    if (!notification) {
      this.logger.error(
        `Notification ${event.notificationId} not found for real-time delivery`
      );
      return;
    }
    
    // Get user's active sockets
    const sockets = await this.getUserSockets(notification.recipient.toString());
    
    if (sockets.length === 0) {
      this.logger.debug(
        `No active sockets for user ${notification.recipient.toString()}`
      );
      return;
    }
    
    // Format notification for real-time delivery
    const formatted = this.formatNotificationResponse(notification);
    
    // Emit to all user's sockets
    for (const socketId of sockets) {
      this.emitToSocket(
        socketId,
        NotificationSocketEvent.NEW_NOTIFICATION,
        formatted
      );
    }
    
    // Update status to delivered
    await notificationRepository.updateDeliveryStatus(
      notification._id,
      NotificationStatus.DELIVERED
    );
  }

  private async handleNotificationRead(event: {
    notificationId: string;
    recipientId: string;
    readAt: Date;
  }): Promise<void> {
    // Get user's active sockets
    const sockets = await this.getUserSockets(event.recipientId);
    
    if (sockets.length === 0) return;
    
    // Emit read update to all sockets
    for (const socketId of sockets) {
      this.emitToSocket(socketId, NotificationSocketEvent.NOTIFICATION_READ, {
        notificationId: event.notificationId,
        readAt: event.readAt,
      });
    }
  }

  private async handleNotificationDeleted(event: {
    notificationId: string;
    recipientId: string;
    deletedAt: Date;
  }): Promise<void> {
    // Get user's active sockets
    const sockets = await this.getUserSockets(event.recipientId);
    
    if (sockets.length === 0) return;
    
    // Emit delete update to all sockets
    for (const socketId of sockets) {
      this.emitToSocket(socketId, NotificationSocketEvent.NOTIFICATION_DELETE, {
        notificationId: event.notificationId,
      });
    }
  }

  private async updateUnreadCount(userId: string): Promise<void> {
    const count = await notificationRepository.countUnread(
      new Types.ObjectId(userId)
    );
    
    const cacheKey = `${CacheKey.UNREAD_COUNT}${userId}`;
    await this.redis.setex(cacheKey, 60, count.toString()); // Cache for 60 seconds
    
    // Emit count update to all user's sockets
    this.emitUnreadCount(userId);
  }

  private async emitUnreadCount(userId: string): Promise<void> {
    const count = await this.getUnreadCount(userId);
    const sockets = await this.getUserSockets(userId);
    
    for (const socketId of sockets) {
      this.emitToSocket(socketId, NotificationSocketEvent.NOTIFICATION_COUNT, {
        count,
      });
    }
  }

  private async getUserSockets(userId: string): Promise<string[]> {
    const key = `${CacheKey.USER_SOCKETS}${userId}`;
    return this.redis.smembers(key);
  }

  private emitToSocket(socketId: string, event: string, data: any): void {
    // In a real implementation, this would use your Socket.IO server
    // to emit to the specific socket ID
    this.eventEmitter.emit(`socket:${socketId}:${event}`, data);
  }

  private formatNotificationResponse(
    notification: INotification
  ): NotificationResponse {
    return {
      id: notification._id.toString(),
      recipient: notification.recipient.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      priority: notification.priority,
      status: notification.status,
      isRead: notification.isRead,
      readAt: notification.readAt || null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}

export const notificationService = new NotificationService(
  new EventEmitter(),
  new (require("ioredis"))() as Redis, // Mock Redis
  console // Mock logger
);