import { NotificationModel } from "../models/notification.model";
import {
  INotification,
  NotificationStatus,
  NotificationType,
  NotificationPriority,
} from "../notifications.types";
import { Types } from "mongoose";

class NotificationRepository {
  async create(
    notificationData: Omit<
      INotification,
      "_id" | "createdAt" | "updatedAt"
    >
  ): Promise<INotification> {
    const notification = await NotificationModel.create(notificationData);
    return notification.toObject();
  }

  async findById(
    notificationId: string | Types.ObjectId
  ): Promise<INotification | null> {
    return NotificationModel.findById(notificationId).lean<INotification>();
  }

  async findByRecipient(
    recipientId: string | Types.ObjectId,
    options: {
      limit?: number;
      cursor?: string;
      type?: NotificationType | NotificationType[];
      status?: NotificationStatus | NotificationStatus[];
      isRead?: boolean;
      priority?: NotificationPriority | NotificationPriority[];
    } = {}
  ): Promise<{
    notifications: INotification[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const { limit = 20, cursor, type, status, isRead, priority } = options;
    
    const query: any = { recipient: recipientId };
    
    if (type) {
      query.type = Array.isArray(type) ? { $in: type } : type;
    }
    
    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status;
    }
    
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    
    if (priority) {
      query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }
    
    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) }; // Cursor-based pagination
    }
    
    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit + 1) // +1 to check if there are more
      .lean<INotification[]>();
    
    const hasMore = notifications.length > limit;
    const result = hasMore ? notifications.slice(0, -1) : notifications;
    
    return {
      notifications: result,
      hasMore,
      nextCursor: hasMore ? notifications[notifications.length - 1]._id.toString() : null,
    };
  }

  async markRead(
    notificationId: string | Types.ObjectId
  ): Promise<INotification | null> {
    return NotificationModel.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
      { new: true }
    ).lean<INotification>();
  }

  async markAllRead(recipientId: string | Types.ObjectId): Promise<number> {
    const result = await NotificationModel.updateMany(
      {
        recipient: recipientId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          status: NotificationStatus.READ,
        },
      }
    );
    
    return result.modifiedCount;
  }

  async delete(
    notificationId: string | Types.ObjectId
  ): Promise<INotification | null> {
    return NotificationModel.findByIdAndDelete(notificationId).lean<INotification>();
  }

  async countUnread(
    recipientId: string | Types.ObjectId
  ): Promise<number> {
    return NotificationModel.countDocuments({
      recipient: recipientId,
      isRead: false,
    });
  }

  async findRecent(
    recipientId: string | Types.ObjectId,
    limit: number = 5
  ): Promise<INotification[]> {
    return NotificationModel.find({
      recipient: recipientId,
    })
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .lean<INotification[]>();
  }
}

export const notificationRepository = new NotificationRepository();