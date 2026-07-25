import mongoose, { Document, Schema } from "mongoose";
import { IConversation, ConversationStatus } from "../chats.types";

const ConversationSchema: Schema = new Schema(
  {
    bottleId: {
      type: Schema.Types.ObjectId,
      ref: "Bottle",
      required: true,
      unique: true, // Enforce one conversation per bottle
      index: true,
    },
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: true,
      validate: {
        validator: (participants: Types.ObjectId[]) => participants.length === 2,
        message: "A conversation must have exactly 2 participants",
      },
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ConversationStatus),
      default: ConversationStatus.ACTIVE,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
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
ConversationSchema.index({ participants: 1, status: 1 }); // For user conversation lists
ConversationSchema.index({ participants: 1, updatedAt: -1 }); // For recent conversations
ConversationSchema.index({ status: 1, updatedAt: -1 }); // For active conversations
ConversationSchema.index({ bottleId: 1 }); // For bottle-conversation lookup

// Virtual for id (to avoid returning _id in responses)
ConversationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Virtual for last message (populated in service layer)
ConversationSchema.virtual("lastMessage", {
  ref: "Message",
  localField: "_id",
  foreignField: "conversationId",
  justOne: true,
  options: { sort: { createdAt: -1 } },
});

export const ConversationModel = mongoose.model<IConversation & Document>(
  "Conversation",
  ConversationSchema
);