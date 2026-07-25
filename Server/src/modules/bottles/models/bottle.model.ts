import mongoose, { Document, Schema } from "mongoose";
import { IBottle, BottleStatus, BottleMood, DeliveryType } from "../bottles.types";

const BottleSchema: Schema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    mood: {
      type: String,
      enum: Object.values(BottleMood),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BottleStatus),
      default: BottleStatus.DRAFT,
      index: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    deliveryType: {
      type: String,
      enum: Object.values(DeliveryType),
      required: true,
    },
    deliveryTime: {
      type: Date,
      default: null,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    favoriteCount: {
      type: Number,
      default: 0,
    },
    passCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      maxlength: [10, "Cannot have more than 10 tags"],
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
BottleSchema.index({ sender: 1, status: 1 });
BottleSchema.index({ status: 1, deliveryTime: 1 });
BottleSchema.index({ mood: 1 });
BottleSchema.index({ createdAt: -1 });
BottleSchema.index({ tags: 1 });

// Virtual for id (to avoid returning _id in responses)
BottleSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export const BottleModel = mongoose.model<IBottle & Document>("Bottle", BottleSchema);