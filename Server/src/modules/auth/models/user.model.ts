import mongoose, { Document, Schema } from "mongoose";
import type { IUser, IUserMethods } from "../auth.types.js";

const UserSchema: Schema<IUser, {}, IUserMethods> = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      maxlength: [30, "Username cannot exceed 30 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be either 'user' or 'admin'",
      },
      default: "user",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "suspended"],
        message: "Status must be active, inactive, or suspended",
      },
      default: "active",
    },
    refreshToken: {
      type: String,
      select: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await globalThis.bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = mongoose.model<IUser, {}, IUserMethods>("User", UserSchema);