import { Types } from "mongoose";
import { IUser } from "../auth/auth.types";

// Cloudinary image type
interface CloudinaryImage {
  public_id: string;
  url: string;
}

// Request DTOs
export interface UpdateProfileInput {
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

export interface UpdateAvatarInput {
  avatar: Express.Multer.File;
}

export interface UpdateCoverImageInput {
  coverImage: Express.Multer.File;
}

export interface UpdateUsernameInput {
  username: string;
}

export interface SearchUsersInput {
  query: string;
  limit?: number;
  page?: number;
}

// Response DTOs
export interface UserProfileResponse {
  _id: string;
  username: string;
  email: string;
  avatar?: CloudinaryImage;
  coverImage?: CloudinaryImage;
  bio?: string;
  role: string;
  status: string;
  lastSeen?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extended user type with Cloudinary images
export interface IUserWithImages extends Omit<IUser, "avatar" | "coverImage"> {
  avatar?: CloudinaryImage;
  coverImage?: CloudinaryImage;
}

// Search results type
export interface SearchResults {
  users: UserProfileResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}