import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../../../common/middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Notification routes
router.get(
  "/",
  notificationController.getNotifications.bind(notificationController)
);

router.get(
  "/:id",
  notificationController.getNotification.bind(notificationController)
);

router.patch(
  "/:id/read",
  notificationController.markRead.bind(notificationController)
);

router.patch(
  "/read-all",
  notificationController.markAllRead.bind(notificationController)
);

router.delete(
  "/:id",
  notificationController.deleteNotification.bind(notificationController)
);

router.get(
  "/unread-count",
  notificationController.getUnreadCount.bind(notificationController)
);

export const notificationRoutes = router;