import { Types } from "mongoose";

// Bottle status enum
export enum BottleStatus {
  DRAFT = "draft",
  THROWN = "thrown",
  DELIVERED = "delivered",
  OPENED = "opened",
  REPLIED = "replied",
  ARCHIVED = "archived",
}

// Mood enum
export enum BottleMood {
  HAPPY = "happy",
  SAD = "sad",
  LONELY = "lonely",
  LOVE = "love",
  CONFESSION = "confession",
  ADVICE = "advice",
  QUESTION = "question",
  RANDOM = "random",
}

// Delivery type enum
export enum DeliveryType {
  IMMEDIATE = "immediate",
  DELAYED = "delayed",
  SCHEDULED = "scheduled",
}

// Bottle interface for database model
export interface IBottle {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  recipient: Types.ObjectId | null;
  message: string;
  mood: BottleMood;
  status: BottleStatus;
  isAnonymous: boolean;
  deliveryType: DeliveryType;
  deliveryTime: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  archivedAt: Date | null;
  favoriteCount: number;
  passCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Request DTOs
export interface CreateBottleInput {
  message: string;
  mood: BottleMood;
  isAnonymous: boolean;
  deliveryType: DeliveryType;
  deliveryTime?: Date;
  tags?: string[];
}

export interface UpdateBottleInput {
  message?: string;
  mood?: BottleMood;
  isAnonymous?: boolean;
  deliveryType?: DeliveryType;
  deliveryTime?: Date;
  tags?: string[];
}

// Response DTOs
export interface BottleResponse {
  id: string;
  sender: string;
  recipient: string | null;
  message: string;
  mood: BottleMood;
  status: BottleStatus;
  isAnonymous: boolean;
  deliveryType: DeliveryType;
  deliveryTime: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  archivedAt: Date | null;
  favoriteCount: number;
  passCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Bottle list item (simplified for lists)
export interface BottleListItem {
  id: string;
  mood: BottleMood;
  status: BottleStatus;
  isAnonymous: boolean;
  deliveryType: DeliveryType;
  deliveryTime: Date | null;
  favoriteCount: number;
  createdAt: Date;
}

// Paginated response for bottle lists
export interface PaginatedBottlesResponse {
  bottles: BottleListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}