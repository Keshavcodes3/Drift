import mongoose, { Document, Schema } from "mongoose";
import {
  INotification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from "../notifications.types";

const NotificationSchema: Schema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for performance
NotificationSchema.index({ recipient: 1, createdAt: -1 }); // For user notification lists
NotificationSchema.index({ recipient: 1, isRead: 1 }); // For unread counts
NotificationSchema.index({ recipient: 1, type: 1 }); // For filtering by type
NotificationSchema.index({ recipient: 1, priority: 1 }); // For priority filtering
NotificationSchema.index({ recipient: 1, status: 1 }); // For status filtering
NotificationSchema.index({ createdAt: -1 }); // For recent notifications

// Virtual for id (to avoid returning _id in responses)
NotificationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export const NotificationModel = mongoose.model<INotification & Document>(
  "Notification",
  NotificationSchema
);