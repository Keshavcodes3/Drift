import mongoose from "mongoose";

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  refreshToken?: string;
  role: "user" | "admin";
  status: "active" | "inactive" | "suspended";
  lastSeen?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = mongoose.Model<IUser, {}, IUserMethods>;