import { Server as SocketIOServer, Socket } from "socket.io";
import { Redis } from "ioredis";
import { EventEmitter } from "events";
import {
  NotificationSocketEvent,
  NotificationEvent,
  CacheKey,
} from "../notifications.types";
import { AuthenticatedSocket } from "../../auth/auth.types";

class NotificationSocketHandler {
  constructor(
    private io: SocketIOServer,
    private redis: Redis,
    private eventEmitter: EventEmitter,
    private logger: typeof console
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for notification events from the service
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

  public handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user.id;
    
    // Store socket ID in Redis for this user
    const socketKey = `${CacheKey.USER_SOCKETS}${userId}`;
    this.redis.sadd(socketKey, socket.id);
    this.redis.expire(socketKey, 86400); // Expire after 24 hours
    
    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Send current unread count on connection
    this.sendUnreadCount(userId, socket);
    
    this.logger.info(`User ${userId} connected with socket ${socket.id}`);
    
    socket.on("disconnect", () => {
      this.handleDisconnect(socket, userId);
    });
  }

  private handleDisconnect(socket: Socket, userId: string): void {
    // Remove socket ID from Redis
    const socketKey = `${CacheKey.USER_SOCKETS}${userId}`;
    this.redis.srem(socketKey, socket.id);
    
    this.logger.info(`User ${userId} disconnected from socket ${socket.id}`);
  }

  private async handleNotificationCreated(event: {
    notificationId: string;
    recipientId: string;
    type: string;
    priority: string;
    createdAt: Date;
  }): Promise<void> {
    // Get user's sockets from Redis
    const sockets = await this.getUserSockets(event.recipientId);
    
    if (sockets.length === 0) {
      this.logger.debug(
        `No active sockets for user ${event.recipientId} to deliver notification ${event.notificationId}`
      );
      return;
    }
    
    // Get the full notification from database (in a real app, you might cache this)
    // For this example, we'll just forward the event data
    
    // Emit to user's personal room
    this.io.to(`user:${event.recipientId}`).emit(
      NotificationSocketEvent.NEW_NOTIFICATION,
      {
        id: event.notificationId,
        type: event.type,
        priority: event.priority,
        createdAt: event.createdAt,
      }
    );
    
    this.logger.info(
      `Notification ${event.notificationId} delivered to user ${event.recipientId} via ${sockets.length} sockets`
    );
  }

  private async handleNotificationRead(event: {
    notificationId: string;
    recipientId: string;
    readAt: Date;
  }): Promise<void> {
    // Emit read update to user's personal room
    this.io.to(`user:${event.recipientId}`).emit(
      NotificationSocketEvent.NOTIFICATION_READ,
      {
        notificationId: event.notificationId,
        readAt: event.readAt,
      }
    );
  }

  private async handleNotificationDeleted(event: {
    notificationId: string;
    recipientId: string;
    deletedAt: Date;
  }): Promise<void> {
    // Emit delete update to user's personal room
    this.io.to(`user:${event.recipientId}`).emit(
      NotificationSocketEvent.NOTIFICATION_DELETE,
      {
        notificationId: event.notificationId,
      }
    );
  }

  private async sendUnreadCount(userId: string, socket: Socket): Promise<void> {
    // In a real implementation, you would get this from Redis cache
    // or from the notification service
    const count = 0; // Placeholder - would be fetched from cache/service
    
    socket.emit(NotificationSocketEvent.NOTIFICATION_COUNT, { count });
  }

  private async getUserSockets(userId: string): Promise<string[]> {
    const key = `${CacheKey.USER_SOCKETS}${userId}`;
    return this.redis.smembers(key);
  }

  // Public method to emit unread count updates
  public async emitUnreadCount(userId: string, count: number): Promise<void> {
    this.io.to(`user:${userId}`).emit(NotificationSocketEvent.NOTIFICATION_COUNT, {
      count,
    });
  }
}

// Factory function for dependency injection
export function createNotificationSocketHandler(
  io: SocketIOServer,
  redis: Redis,
  eventEmitter: EventEmitter,
  logger: typeof console
): NotificationSocketHandler {
  return new NotificationSocketHandler(io, redis, eventEmitter, logger);
}