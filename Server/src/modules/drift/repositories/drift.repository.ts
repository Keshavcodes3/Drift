import { BottleModel } from "../../bottles/models/bottle.model";
import { IDriftBottle, DeliveryStatus, DeliveryMetadata } from "../drift.types";
import { Types } from "mongoose";
import { BottleStatus } from "../../bottles/bottles.types";

class DriftRepository {
  async findById(bottleId: string | Types.ObjectId): Promise<IDriftBottle | null> {
    return BottleModel.findById(bottleId).lean<IDriftBottle>();
  }

  async updateDeliveryStatus(
    bottleId: string | Types.ObjectId,
    status: DeliveryStatus,
    metadata: Partial<DeliveryMetadata>
  ): Promise<IDriftBottle | null> {
    const update: Partial<IDriftBottle> = {
      "deliveryMetadata.status": status,
      "deliveryMetadata.attempts": metadata.attempts,
      "deliveryMetadata.lastAttempt": metadata.lastAttempt,
      "deliveryMetadata.nextAttempt": metadata.nextAttempt,
      "deliveryMetadata.error": metadata.error,
      updatedAt: new Date(),
    };

    // Add recipient if provided
    if (metadata.recipient) {
      update.recipient = new Types.ObjectId(metadata.recipient);
      update["deliveryMetadata.recipient"] = metadata.recipient;
    }

    // Add status-specific timestamps
    if (status === DeliveryStatus.DELIVERED && metadata.deliveredAt) {
      update["deliveryMetadata.deliveredAt"] = metadata.deliveredAt;
      update.status = BottleStatus.DELIVERED;
    } else if (status === DeliveryStatus.EXPIRED && metadata.expiredAt) {
      update["deliveryMetadata.expiredAt"] = metadata.expiredAt;
      update.status = BottleStatus.ARCHIVED;
    } else if (status === DeliveryStatus.CANCELLED && metadata.cancelledAt) {
      update["deliveryMetadata.cancelledAt"] = metadata.cancelledAt;
      update.status = BottleStatus.DRAFT;
    }

    return BottleModel.findByIdAndUpdate(bottleId, update, {
      new: true,
    }).lean<IDriftBottle>();
  }

  async queueBottle(
    bottleId: string | Types.ObjectId,
    deliveryTime: Date,
    jobId: string
  ): Promise<IDriftBottle | null> {
    return BottleModel.findByIdAndUpdate(
      bottleId,
      {
        status: BottleStatus.THROWN,
        "deliveryMetadata.status": DeliveryStatus.QUEUED,
        "deliveryMetadata.attempts": 0,
        "deliveryMetadata.nextAttempt": deliveryTime,
        "deliveryMetadata.jobId": jobId,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IDriftBottle>();
  }

  async assignRecipient(
    bottleId: string | Types.ObjectId,
    recipientId: string,
    deliveryTime: Date
  ): Promise<IDriftBottle | null> {
    return BottleModel.findByIdAndUpdate(
      bottleId,
      {
        recipient: new Types.ObjectId(recipientId),
        "deliveryMetadata.status": DeliveryStatus.DRIFTING,
        "deliveryMetadata.recipient": recipientId,
        "deliveryMetadata.nextAttempt": deliveryTime,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IDriftBottle>();
  }

  async markDelivered(
    bottleId: string | Types.ObjectId,
    deliveredAt: Date
  ): Promise<IDriftBottle | null> {
    return BottleModel.findByIdAndUpdate(
      bottleId,
      {
        status: BottleStatus.DELIVERED,
        "deliveryMetadata.status": DeliveryStatus.DELIVERED,
        "deliveryMetadata.deliveredAt": deliveredAt,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IDriftBottle>();
  }

  async markExpired(
    bottleId: string | Types.ObjectId,
    expiredAt: Date
  ): Promise<IDriftBottle | null> {
    return BottleModel.findByIdAndUpdate(
      bottleId,
      {
        status: BottleStatus.ARCHIVED,
        "deliveryMetadata.status": DeliveryStatus.EXPIRED,
        "deliveryMetadata.expiredAt": expiredAt,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IDriftBottle>();
  }

  async markCancelled(
    bottleId: string | Types.ObjectId,
    cancelledAt: Date
  ): Promise<IDriftBottle | null> {
    return BottleModel.findByIdAndUpdate(
      bottleId,
      {
        status: BottleStatus.DRAFT,
        "deliveryMetadata.status": DeliveryStatus.CANCELLED,
        "deliveryMetadata.cancelledAt": cancelledAt,
        recipient: null,
        "deliveryMetadata.recipient": null,
        "deliveryMetadata.nextAttempt": null,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IDriftBottle>();
  }

  async incrementRetryAttempt(
    bottleId: string | Types.ObjectId,
    error: string
  ): Promise<IDriftBottle | null> {
    return BottleModel.findByIdAndUpdate(
      bottleId,
      {
        $inc: { "deliveryMetadata.attempts": 1 },
        "deliveryMetadata.status": DeliveryStatus.RETRYING,
        "deliveryMetadata.error": error,
        "deliveryMetadata.lastAttempt": new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    ).lean<IDriftBottle>();
  }

  async getDeliveryStatus(
    bottleId: string | Types.ObjectId
  ): Promise<DeliveryStatusResponse | null> {
    const bottle = await BottleModel.findById(bottleId)
      .select("status deliveryMetadata")
      .lean<IDriftBottle>();
    
    if (!bottle) return null;
    
    return {
      bottleId: bottle._id.toString(),
      status: bottle.deliveryMetadata.status,
      recipient: bottle.deliveryMetadata.recipient,
      deliveredAt: bottle.deliveryMetadata.deliveredAt || undefined,
      expiredAt: bottle.deliveryMetadata.expiredAt || undefined,
      cancelledAt: bottle.deliveryMetadata.cancelledAt || undefined,
      attempts: bottle.deliveryMetadata.attempts,
      nextAttempt: bottle.deliveryMetadata.nextAttempt || undefined,
      error: bottle.deliveryMetadata.error || undefined,
      jobId: bottle.deliveryMetadata.jobId || undefined,
    };
  }

  async findBottlesByStatus(
    status: DeliveryStatus,
    limit: number = 100
  ): Promise<IDriftBottle[]> {
    return BottleModel.find({
      "deliveryMetadata.status": status,
    })
      .limit(limit)
      .lean<IDriftBottle[]>();
  }

  async findExpiredBottles(limit: number = 100): Promise<IDriftBottle[]> {
    return BottleModel.find({
      "deliveryMetadata.status": {
        $in: [DeliveryStatus.QUEUED, DeliveryStatus.DRIFTING, DeliveryStatus.RETRYING],
      },
      "deliveryMetadata.nextAttempt": { $lt: new Date() },
    })
      .limit(limit)
      .lean<IDriftBottle[]>();
  }
}

export const driftRepository = new DriftRepository();