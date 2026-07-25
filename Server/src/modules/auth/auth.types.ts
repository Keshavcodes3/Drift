import { Document, Model, Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  role: "user" | "admin";
  status: "active" | "inactive" | "suspended";
  refreshToken?: string;
  lastSeen?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

export interface JwtPayload {
  id: Types.ObjectId;
  email: string;
  role: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user: {
    id: Types.ObjectId;
    email: string;
    role: string;
  };
}