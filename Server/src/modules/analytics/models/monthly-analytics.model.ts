import mongoose, { Document, Schema } from "mongoose";
import { IMonthlyAnalytics } from "../analytics.types";

const MonthlyAnalyticsSchema: Schema = new Schema(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    activeUsers: {
      type: Number,
      default: 0,
    },
    avgOnlineUsers: {
      type: Number,
      default: 0,
    },
    bottlesCreated: {
      type: Number,
      default: 0,
    },
    bottlesDelivered: {
      type: Number,
      default: 0,
    },
    bottlesOpened: {
      type: Number,
      default: 0,
    },
    bottlesExpired: {
      type: Number,
      default: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    messagesRead: {
      type: Number,
      default: 0,
    },
    conversationsStarted: {
      type: Number,
      default: 0,
    },
    notificationsSent: {
      type: Number,
      default: 0,
    },
    reportsCreated: {
      type: Number,
      default: 0,
    },
    avgReplyTime: {
      type: Number,
      default: 0, // in milliseconds
    },
    avgDeliveryTime: {
      type: Number,
      default: 0, // in milliseconds
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

// Compound index for year+month queries
MonthlyAnalyticsSchema.index({ year: 1, month: 1 }, { unique: true });
MonthlyAnalyticsSchema.index({ newUsers: -1 }); // For user growth trends
MonthlyAnalyticsSchema.index({ activeUsers: -1 }); // For engagement trends
MonthlyAnalyticsSchema.index({ bottlesCreated: -1 }); // For bottle activity trends
MonthlyAnalyticsSchema.index({ messagesSent: -1 }); // For chat activity trends

// Virtual for id (to avoid returning _id in responses)
MonthlyAnalyticsSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Virtual for start and end dates of the month
MonthlyAnalyticsSchema.virtual("startDate").get(function () {
  return new Date(this.year, this.month - 1, 1);
});

MonthlyAnalyticsSchema.virtual("endDate").get(function () {
  return new Date(this.year, this.month, 0); // Last day of month
});

export const MonthlyAnalyticsModel = mongoose.model<IMonthlyAnalytics & Document>(
  "MonthlyAnalytics",
  MonthlyAnalyticsSchema
);