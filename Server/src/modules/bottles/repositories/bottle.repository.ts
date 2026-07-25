import { BottleModel } from "../models/bottle.model";
import { IBottle, BottleStatus } from "../bottles.types";
import { Types } from "mongoose";

class BottleRepository {
  async create(bottleData: Omit<IBottle, "_id" | "createdAt" | "updatedAt">): Promise<IBottle> {
    const bottle = await BottleModel.create(bottleData);
    return bottle.toObject();
  }

  async findById(id: string | Types.ObjectId): Promise<IBottle | null> {
    return BottleModel.findById(id).lean<IBottle>();
  }

  async findBySender(
    senderId: string | Types.ObjectId,
    status?: BottleStatus
  ): Promise<IBottle[]> {
    const query = { sender: senderId };
    if (status) {
      Object.assign(query, { status });
    }
    return BottleModel.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .lean<IBottle[]>();
  }

  async update(
    id: string | Types.ObjectId,
    updateData: Partial<IBottle>
  ): Promise<IBottle | null> {
    return BottleModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean<IBottle>();
  }

  async delete(id: string | Types.ObjectId): Promise<IBottle | null> {
    return BottleModel.findByIdAndDelete(id).lean<IBottle>();
  }

  async throwBottle(
    id: string | Types.ObjectId,
    deliveryTime: Date | null
  ): Promise<IBottle | null> {
    return BottleModel.findByIdAndUpdate(
      id,
      {
        status: BottleStatus.THROWN,
        deliveryTime,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IBottle>();
  }

  async archiveBottle(id: string | Types.ObjectId): Promise<IBottle | null> {
    return BottleModel.findByIdAndUpdate(
      id,
      {
        status: BottleStatus.ARCHIVED,
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IBottle>();
  }

  async favoriteBottle(
    id: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<IBottle | null> {
    // Check if user already favorited this bottle
    const bottle = await BottleModel.findById(id).lean<IBottle>();
    
    if (!bottle) {
      return null;
    }
    
    // In a real implementation, we would check a favorites collection
    // For now, we'll just increment the count
    return BottleModel.findByIdAndUpdate(
      id,
      {
        $inc: { favoriteCount: 1 },
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IBottle>();
  }

  async getMyBottles(
    userId: string | Types.ObjectId,
    status?: BottleStatus,
    limit: number = 10,
    page: number = 1
  ): Promise<{ bottles: IBottle[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const query = { sender: userId };
    if (status) {
      Object.assign(query, { status });
    }
    
    const [bottles, total] = await Promise.all([
      BottleModel.find(query)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .lean<IBottle[]>(),
      BottleModel.countDocuments(query),
    ]);
    
    return { bottles, total };
  }
}

export const bottleRepository = new BottleRepository();