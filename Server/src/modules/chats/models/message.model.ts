import mongoose, { Document, Schema } from "mongoose";
import { IMessage, MessageType, MessageStatus } from "../chats.types";

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    attachments: {
      type: [
        {
          url: String,
          type: String,
          size: Number,
          name: String,
          publicId: String,
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    seenAt: {
      type: Date,
      default: null,
      index: true,
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
MessageSchema.index({ conversationId: 1, createdAt: -1 }); // For message listing
MessageSchema.index({ conversationId: 1, status: 1 }); // For status filtering
MessageSchema.index({ sender: 1, createdAt: -1 }); // For user message history
MessageSchema.index({ receiver: 1, seenAt: 1 }); // For unread messages
MessageSchema.index({ createdAt: -1 }); // For recent messages

// Virtual for id (to avoid returning _id in responses)
MessageSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export const MessageModel = mongoose.model<IMessage & Document>("Message", MessageSchema);