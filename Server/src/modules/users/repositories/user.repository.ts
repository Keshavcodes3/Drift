import { UserModel } from "../../auth/models/user.model";
import { IUserWithImages, UpdateProfileInput } from "../users.types";
import { Types } from "mongoose";

class UserRepository {
  async findById(id: string | Types.ObjectId): Promise<IUserWithImages | null> {
    return UserModel.findById(id).lean<IUserWithImages>();
  }

  async findByUsername(username: string): Promise<IUserWithImages | null> {
    return UserModel.findOne({ username }).lean<IUserWithImages>();
  }

  async updateProfile(
    userId: string | Types.ObjectId,
    updateData: UpdateProfileInput
  ): Promise<IUserWithImages | null> {
    return UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).lean<IUserWithImages>();
  }

  async updateAvatar(
    userId: string | Types.ObjectId,
    avatar: { public_id: string; url: string }
  ): Promise<IUserWithImages | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { avatar, lastSeen: new Date() },
      { new: true }
    ).lean<IUserWithImages>();
  }

  async updateCoverImage(
    userId: string | Types.ObjectId,
    coverImage: { public_id: string; url: string }
  ): Promise<IUserWithImages | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { coverImage, lastSeen: new Date() },
      { new: true }
    ).lean<IUserWithImages>();
  }

  async updateUsername(
    userId: string | Types.ObjectId,
    username: string
  ): Promise<IUserWithImages | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { username, lastSeen: new Date() },
      { new: true }
    ).lean<IUserWithImages>();
  }

  async deleteUser(userId: string | Types.ObjectId): Promise<IUserWithImages | null> {
    return UserModel.findByIdAndDelete(userId).lean<IUserWithImages>();
  }

  async softDeleteUser(userId: string | Types.ObjectId): Promise<IUserWithImages | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { status: "inactive", lastSeen: new Date() },
      { new: true }
    ).lean<IUserWithImages>();
  }

  async searchUsers(
    query: string,
    limit: number = 10,
    page: number = 1
  ): Promise<{ users: IUserWithImages[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
        status: "active",
      })
        .select("-password -refreshToken")
        .skip(skip)
        .limit(limit)
        .lean<IUserWithImages[]>(),
      UserModel.countDocuments({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
        status: "active",
      }),
    ]);

    return { users, total };
  }
}

export const userRepository = new UserRepository();