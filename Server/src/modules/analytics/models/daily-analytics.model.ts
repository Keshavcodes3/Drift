import mongoose, { Document, Schema } from "mongoose";
import { IDailyAnalytics } from "../analytics.types";

const DailyAnalyticsSchema: Schema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true, // One document per day
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
    onlineUsers: {
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
    averageReplyTime: {
      type: Number,
      default: 0, // in milliseconds
    },
    averageDeliveryTime: {
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

// Indexes for performance
DailyAnalyticsSchema.index({ date: 1 }); // Primary query index
DailyAnalyticsSchema.index({ date: -1 }); // For recent dates
DailyAnalyticsSchema.index({ newUsers: -1 }); // For user growth trends
DailyAnalyticsSchema.index({ activeUsers: -1 }); // For engagement trends
DailyAnalyticsSchema.index({ bottlesCreated: -1 }); // For bottle activity trends
DailyAnalyticsSchema.index({ messagesSent: -1 }); // For chat activity trends

// Virtual for id (to avoid returning _id in responses)
DailyAnalyticsSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Static method to create or update daily analytics
DailyAnalyticsSchema.statics.upsertDailyAnalytics = async function (
  date: Date,
  updates: Partial<IDailyAnalytics>
) {
  return this.findOneAndUpdate(
    { date },
    { $set: updates },
    { upsert: true, new: true }
  );
};

// Static method to increment counters
DailyAnalyticsSchema.statics.incrementCounters = async function (
  date: Date,
  increments: Partial<Record<keyof IDailyAnalytics, number>>
) {
  const update: any = {};
  
  for (const [key, value] of Object.entries(increments)) {
    if (typeof value === "number") {
      update[`$inc.${key}`] = value;
    }
  }
  
  return this.findOneAndUpdate(
    { date },
    update,
    { upsert: true, new: true }
  );
};

export const DailyAnalyticsModel = mongoose.model<IDailyAnalytics & Document>(
  "DailyAnalytics",
  DailyAnalyticsSchema
);