import { UserModel } from "../models/user.model.js";
import { type IUser } from "../types/user.types.js";

class UserRepository {
  async create(userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">): Promise<IUser> {
    const user = await UserModel.create(userData);
    return user.toObject();
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id).lean<IUser>();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email }).lean<IUser>();
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username }).lean<IUser>();
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      refreshToken,
      lastSeen: new Date(),
    });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 },
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      password: newPassword,
      updatedAt: new Date(),
    });
  }

  async updateLastSeen(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      lastSeen: new Date(),
    });
  }
}

export const userRepository = new UserRepository();