import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../../../common/errors/api.error";
import { StatusCodes } from "http-status-codes";
import {
  IUserWithImages,
  UpdateProfileInput,
  UpdateAvatarInput,
  UpdateCoverImageInput,
  UpdateUsernameInput,
  SearchUsersInput,
  UserProfileResponse,
  SearchResults,
} from "../users.types";
import { Types } from "mongoose";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

class UserService {
  constructor(
    private cloudinary = globalThis.cloudinary
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    if (user.status !== "active") {
      throw new ApiError(StatusCodes.FORBIDDEN, "User account is not active");
    }
    
    return this.formatUserResponse(user);
  }

  async getUserById(userId: string): Promise<UserProfileResponse> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    if (user.status !== "active") {
      throw new ApiError(StatusCodes.FORBIDDEN, "User account is not active");
    }
    
    return this.formatUserResponse(user);
  }

  async updateProfile(
    userId: string,
    updateData: UpdateProfileInput
  ): Promise<UserProfileResponse> {
    const user = await userRepository.updateProfile(userId, updateData);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    return this.formatUserResponse(user);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File
  ): Promise<UserProfileResponse> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    try {
      // Delete previous avatar if it exists
      if (user.avatar?.public_id) {
        await new Promise((resolve, reject) => {
          this.cloudinary.uploader.destroy(
            user.avatar.public_id,
            (error: UploadApiErrorResponse, result: any) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        });
      }
      
      // Upload new avatar
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        this.cloudinary.uploader.upload_stream(
          {
            folder: `drift/users/${userId}/avatars`,
            public_id: `user_${userId}_avatar_${Date.now()}`,
            transformation: {
              width: 500,
              height: 500,
              crop: "fill",
              gravity: "face",
            },
          },
          (error: UploadApiErrorResponse, result: UploadApiResponse) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });
      
      // Update user with new avatar
      const updatedUser = await userRepository.updateAvatar(userId, {
        public_id: result.public_id,
        url: result.secure_url,
      });
      
      if (!updatedUser) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update avatar");
      }
      
      return this.formatUserResponse(updatedUser);
    } catch (error) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to process avatar upload"
      );
    }
  }

  async updateCoverImage(
    userId: string,
    file: Express.Multer.File
  ): Promise<UserProfileResponse> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    try {
      // Delete previous cover image if it exists
      if (user.coverImage?.public_id) {
        await new Promise((resolve, reject) => {
          this.cloudinary.uploader.destroy(
            user.coverImage.public_id,
            (error: UploadApiErrorResponse, result: any) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        });
      }
      
      // Upload new cover image
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        this.cloudinary.uploader.upload_stream(
          {
            folder: `drift/users/${userId}/covers`,
            public_id: `user_${userId}_cover_${Date.now()}`,
            transformation: {
              width: 1200,
              height: 630,
              crop: "fill",
            },
          },
          (error: UploadApiErrorResponse, result: UploadApiResponse) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });
      
      // Update user with new cover image
      const updatedUser = await userRepository.updateCoverImage(userId, {
        public_id: result.public_id,
        url: result.secure_url,
      });
      
      if (!updatedUser) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update cover image");
      }
      
      return this.formatUserResponse(updatedUser);
    } catch (error) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to process cover image upload"
      );
    }
  }

  async updateUsername(
    userId: string,
    usernameData: UpdateUsernameInput
  ): Promise<UserProfileResponse> {
    const { username } = usernameData;
    
    // Check if username is already taken
    const existingUser = await userRepository.findByUsername(username);
    
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ApiError(StatusCodes.CONFLICT, "Username already taken");
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Username can only contain letters, numbers, and underscores"
      );
    }
    
    if (username.length < 3 || username.length > 30) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Username must be between 3 and 30 characters"
      );
    }
    
    const updatedUser = await userRepository.updateUsername(userId, username);
    
    if (!updatedUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    return this.formatUserResponse(updatedUser);
  }

  async deleteAccount(userId: string, requestingUserId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    // Only allow deletion if:
    // 1. User is deleting their own account, or
    // 2. Requesting user is an admin
    if (userId !== requestingUserId) {
      const requestingUser = await userRepository.findById(requestingUserId);
      
      if (!requestingUser || requestingUser.role !== "admin") {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to delete this account"
        );
      }
    }
    
    try {
      // Delete images from Cloudinary if they exist
      if (user.avatar?.public_id) {
        await new Promise((resolve, reject) => {
          this.cloudinary.uploader.destroy(
            user.avatar.public_id,
            (error: UploadApiErrorResponse, result: any) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        });
      }
      
      if (user.coverImage?.public_id) {
        await new Promise((resolve, reject) => {
          this.cloudinary.uploader.destroy(
            user.coverImage.public_id,
            (error: UploadApiErrorResponse, result: any) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        });
      }
      
      // Delete user from database
      await userRepository.deleteUser(userId);
    } catch (error) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to delete account resources"
      );
    }
  }

  async softDeleteUser(userId: string, requestingUserId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    
    // Only allow soft delete if:
    // 1. User is deactivating their own account, or
    // 2. Requesting user is an admin
    if (userId !== requestingUserId) {
      const requestingUser = await userRepository.findById(requestingUserId);
      
      if (!requestingUser || requestingUser.role !== "admin") {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to deactivate this account"
        );
      }
    }
    
    await userRepository.softDeleteUser(userId);
  }

  async searchUsers(
    input: SearchUsersInput
  ): Promise<SearchResults> {
    const { query, limit = 10, page = 1 } = input;
    
    if (!query || query.trim().length < 2) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Search query must be at least 2 characters"
      );
    }
    
    const { users, total } = await userRepository.searchUsers(query, limit, page);
    
    return {
      users: users.map(this.formatUserResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private formatUserResponse(user: IUserWithImages): UserProfileResponse {
    return {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      coverImage: user.coverImage,
      bio: user.bio,
      role: user.role,
      status: user.status,
      lastSeen: user.lastSeen || undefined,
      isVerified: user.isVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();