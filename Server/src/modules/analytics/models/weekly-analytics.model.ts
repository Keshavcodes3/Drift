import mongoose, { Document, Schema } from "mongoose";
import { IWeeklyAnalytics } from "../analytics.types";

const WeeklyAnalyticsSchema: Schema = new Schema(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    week: {
      type: Number,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
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

// Compound index for year+week queries
WeeklyAnalyticsSchema.index({ year: 1, week: 1 }, { unique: true });
WeeklyAnalyticsSchema.index({ startDate: 1 }); // For date range queries
WeeklyAnalyticsSchema.index({ endDate: 1 }); // For date range queries
WeeklyAnalyticsSchema.index({ newUsers: -1 }); // For user growth trends
WeeklyAnalyticsSchema.index({ activeUsers: -1 }); // For engagement trends

// Virtual for id (to avoid returning _id in responses)
WeeklyAnalyticsSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export const WeeklyAnalyticsModel = mongoose.model<IWeeklyAnalytics & Document>(
  "WeeklyAnalytics",
  WeeklyAnalyticsSchema
);