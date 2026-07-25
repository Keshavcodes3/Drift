import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service";
import { ApiResponse } from "../../../common/utils/api.response";
import { AuthenticatedRequest } from "../../auth/auth.types";
import { StatusCodes } from "http-status-codes";
import {
  NotificationType,
  GetNotificationsDto,
} from "../notifications.types";

class NotificationController {
  async getNotifications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { limit, cursor, type, isRead } = req.query;
      
      // Parse and validate query parameters
      const options: GetNotificationsDto = {
        limit: limit ? parseInt(limit as string) : 20,
        cursor: cursor as string | undefined,
        type: type ? (Array.isArray(type) ? type : [type]) : undefined,
        isRead: isRead ? isRead === "true" : undefined,
      };
      
      // Validate type values if provided
      if (options.type) {
        const validTypes = Object.values(NotificationType);
        for (const t of options.type) {
          if (!validTypes.includes(t as NotificationType)) {
            throw new ApiResponse(
              StatusCodes.BAD_REQUEST,
              `Invalid notification type: ${t}`
            );
          }
        }
      }
      
      const notifications = await notificationService.getNotifications(
        req.user.id,
        options
      );
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Notifications retrieved successfully",
          notifications
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getNotification(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: notificationId } = req.params;
      
      const notification = await notificationService.getNotification(
        req.user.id,
        notificationId
      );
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Notification retrieved successfully",
          notification
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async markRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: notificationId } = req.params;
      
      const notification = await notificationService.markRead(
        req.user.id,
        notificationId
      );
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Notification marked as read",
          notification
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await notificationService.markAllRead(req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          `${result.count} notifications marked as read`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: notificationId } = req.params;
      
      await notificationService.deleteNotification(req.user.id, notificationId);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Notification deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Unread count retrieved successfully", {
          count,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();