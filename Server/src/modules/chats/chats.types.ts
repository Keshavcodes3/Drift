import { Types } from "mongoose";
import { BottleStatus } from "../../bottles/bottles.types";

// Message types
export enum MessageType {
  TEXT = "text",
  // Future types: IMAGE = "image", VIDEO = "video", etc.
}

// Message status
export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  SEEN = "seen",
  EDITED = "edited",
  DELETED = "deleted",
}

// Conversation status
export enum ConversationStatus {
  ACTIVE = "active",
  CLOSED = "closed",
  ARCHIVED = "archived",
}

// Socket.IO event names
export enum ChatSocketEvent {
  JOIN_CONVERSATION = "joinConversation",
  LEAVE_CONVERSATION = "leaveConversation",
  TYPING = "typing",
  STOP_TYPING = "stopTyping",
  SEND_MESSAGE = "sendMessage",
  RECEIVE_MESSAGE = "receiveMessage",
  MESSAGE_SEEN = "messageSeen",
  USER_ONLINE = "userOnline",
  USER_OFFLINE = "userOffline",
  DISCONNECT = "disconnect",
}

// Internal event names for event emitter
export enum ChatEvent {
  CONVERSATION_STARTED = "chat:conversation_started",
  MESSAGE_SENT = "chat:message_sent",
  MESSAGE_EDITED = "chat:message_edited",
  MESSAGE_DELETED = "chat:message_deleted",
  MESSAGE_SEEN = "chat:message_seen",
  USER_TYPING = "chat:user_typing",
  USER_STOPPED_TYPING = "chat:user_stopped_typing",
}

// Attachment interface (for future file uploads)
export interface Attachment {
  url: string;
  type: string;
  size: number;
  name: string;
  publicId?: string; // For cloud storage
}

// Message interface for database
export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message: string;
  messageType: MessageType;
  attachments: Attachment[];
  status: MessageStatus;
  edited: boolean;
  editedAt: Date | null;
  deleted: boolean;
  deletedAt: Date | null;
  seenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation interface for database
export interface IConversation {
  _id: Types.ObjectId;
  bottleId: Types.ObjectId;
  participants: Types.ObjectId[];
  status: ConversationStatus;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for API requests
export interface StartConversationDto {
  bottleId: string;
}

export interface SendMessageDto {
  message: string;
  messageType?: MessageType;
}

export interface EditMessageDto {
  message: string;
}

export interface PaginationDto {
  limit?: number;
  cursor?: string; // Message ID for cursor-based pagination
}

// DTOs for API responses
export interface MessageResponse {
  id: string;
  conversationId: string;
  sender: string;
  receiver: string;
  message: string;
  messageType: MessageType;
  attachments: Attachment[];
  status: MessageStatus;
  edited: boolean;
  editedAt: Date | null;
  deleted: boolean;
  seenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationResponse {
  id: string;
  bottleId: string;
  participants: string[];
  status: ConversationStatus;
  startedAt: Date;
  endedAt: Date | null;
  lastMessage?: MessageResponse;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedMessagesResponse {
  messages: MessageResponse[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PaginatedConversationsResponse {
  conversations: ConversationResponse[];
  hasMore: boolean;
  nextCursor: string | null;
}

// Redis cache keys
export enum CacheKey {
  ONLINE_USERS = "chat:online_users",
  USER_SOCKETS = "chat:user_sockets:",
  TYPING_USERS = "chat:typing_users:",
  ACTIVE_ROOMS = "chat:active_rooms:",
}

// Socket metadata for tracking connections
export interface SocketMetadata {
  userId: string;
  conversationId?: string;
  joinedAt: Date;
}