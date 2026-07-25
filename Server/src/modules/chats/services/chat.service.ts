import { chatRepository } from "../repositories/chat.repository";
import { ApiError } from "../../../common/errors/api.error";
import { StatusCodes } from "http-status-codes";
import {
  IConversation,
  IMessage,
  ConversationStatus,
  MessageStatus,
  StartConversationDto,
  SendMessageDto,
  EditMessageDto,
  MessageResponse,
  ConversationResponse,
  PaginatedMessagesResponse,
  PaginatedConversationsResponse,
  ChatEvent,
  CacheKey,
} from "../chats.types";
import { Types } from "mongoose";
import { bottleService } from "../../bottles/services/bottle.service";
import { userService } from "../../users/services/user.service";
import { EventEmitter } from "events";
import { Redis } from "ioredis";
import { BottleStatus } from "../../bottles/bottles.types";

class ChatService {
  constructor(
    private eventEmitter: EventEmitter,
    private redis: Redis,
    private logger: typeof console
  ) {}

  async startConversation(
    userId: string,
    { bottleId }: StartConversationDto
  ): Promise<ConversationResponse> {
    // Verify bottle exists and is in the correct state
    const bottle = await bottleService.getBottle(bottleId, userId);
    
    if (!bottle) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bottle not found");
    }
    
    // Only delivered and opened bottles can start conversations
    if (
      bottle.status !== BottleStatus.DELIVERED &&
      bottle.status !== BottleStatus.OPENED
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Conversation can only be started for delivered and opened bottles"
      );
    }
    
    // Check if conversation already exists
    const existingConversation = await chatRepository.findConversationByBottle(
      bottleId
    );
    
    if (existingConversation) {
      return this.formatConversationResponse(existingConversation);
    }
    
    // Get bottle recipient (the other participant)
    const recipient = await userService.getUserById(bottle.recipient!);
    
    if (!recipient) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Recipient not found");
    }
    
    // Create conversation
    const conversation = await chatRepository.createConversation({
      bottleId: new Types.ObjectId(bottleId),
      participants: [
        new Types.ObjectId(userId),
        new Types.ObjectId(recipient._id),
      ],
      status: ConversationStatus.ACTIVE,
      startedAt: new Date(),
    });
    
    // Emit event
    this.eventEmitter.emit(ChatEvent.CONVERSATION_STARTED, {
      conversationId: conversation._id.toString(),
      bottleId,
      participants: conversation.participants.map((p) => p.toString()),
    });
    
    return this.formatConversationResponse(conversation);
  }

  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<ConversationResponse> {
    const conversation = await chatRepository.findConversationById(
      conversationId
    );
    
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found");
    }
    
    // Verify user is a participant
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You are not a participant in this conversation"
      );
    }
    
    // Get unread count
    const unreadCount = await chatRepository.countUnreadMessages(
      conversation._id,
      userId
    );
    
    // Get last message
    const lastMessage = await chatRepository.getLastMessage(conversation._id);
    
    const response = this.formatConversationResponse(conversation);
    response.unreadCount = unreadCount;
    
    if (lastMessage) {
      response.lastMessage = this.formatMessageResponse(lastMessage);
    }
    
    return response;
  }

  async getConversations(
    userId: string,
    limit: number = 10,
    cursor?: string
  ): Promise<PaginatedConversationsResponse> {
    const { conversations, hasMore, nextCursor } =
      await chatRepository.findUserConversations(userId, undefined, limit, cursor);
    
    // Enrich conversations with unread counts and last messages
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await chatRepository.countUnreadMessages(
          conversation._id,
          userId
        );
        
        const lastMessage = await chatRepository.getLastMessage(
          conversation._id
        );
        
        const response = this.formatConversationResponse(conversation);
        response.unreadCount = unreadCount;
        
        if (lastMessage) {
          response.lastMessage = this.formatMessageResponse(lastMessage);
        }
        
        return response;
      })
    );
    
    return {
      conversations: enrichedConversations,
      hasMore,
      nextCursor,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    { message, messageType = MessageType.TEXT }: SendMessageDto
  ): Promise<MessageResponse> {
    // Validate message
    if (!message || message.trim().length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Message cannot be empty");
    }
    
    if (message.length > 5000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Message cannot exceed 5000 characters"
      );
    }
    
    // Get conversation
    const conversation = await chatRepository.findConversationById(
      conversationId
    );
    
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found");
    }
    
    // Verify user is a participant
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You are not a participant in this conversation"
      );
    }
    
    // Verify conversation is active
    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot send messages in a closed conversation"
      );
    }
    
    // Get the other participant
    const receiverId = conversation.participants.find(
      (p) => p.toString() !== userId
    )?.toString();
    
    if (!receiverId) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Could not determine message recipient"
      );
    }
    
    // Create message
    const createdMessage = await chatRepository.createMessage({
      conversationId: conversation._id,
      sender: new Types.ObjectId(userId),
      receiver: new Types.ObjectId(receiverId),
      message: message.trim(),
      messageType,
      attachments: [],
      status: MessageStatus.SENT,
      edited: false,
      deleted: false,
    });
    
    // Update conversation
    await ConversationModel.findByIdAndUpdate(conversationId, {
      updatedAt: new Date(),
    });
    
    // Emit event
    this.eventEmitter.emit(ChatEvent.MESSAGE_SENT, {
      messageId: createdMessage._id.toString(),
      conversationId,
      senderId: userId,
      receiverId,
      message: createdMessage.message,
      createdAt: createdMessage.createdAt,
    });
    
    return this.formatMessageResponse(createdMessage);
  }

  async editMessage(
    userId: string,
    messageId: string,
    { message }: EditMessageDto
  ): Promise<MessageResponse> {
    // Validate message
    if (!message || message.trim().length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Message cannot be empty");
    }
    
    if (message.length > 5000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Message cannot exceed 5000 characters"
      );
    }
    
    // Get message
    const existingMessage = await chatRepository.findMessageById(messageId);
    
    if (!existingMessage) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Message not found");
    }
    
    // Verify user is the sender
    if (existingMessage.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You can only edit your own messages"
      );
    }
    
    // Verify message is not deleted
    if (existingMessage.deleted) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot edit a deleted message"
      );
    }
    
    // Update message
    const updatedMessage = await chatRepository.updateMessage(messageId, {
      message: message.trim(),
      edited: true,
      editedAt: new Date(),
      status: MessageStatus.EDITED,
    });
    
    if (!updatedMessage) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update message"
      );
    }
    
    // Update conversation
    await ConversationModel.findByIdAndUpdate(updatedMessage.conversationId, {
      updatedAt: new Date(),
    });
    
    // Emit event
    this.eventEmitter.emit(ChatEvent.MESSAGE_EDITED, {
      messageId: updatedMessage._id.toString(),
      conversationId: updatedMessage.conversationId.toString(),
      senderId: userId,
      newMessage: updatedMessage.message,
      editedAt: updatedMessage.editedAt!,
    });
    
    return this.formatMessageResponse(updatedMessage);
  }

  async deleteMessage(
    userId: string,
    messageId: string
  ): Promise<MessageResponse> {
    // Get message
    const existingMessage = await chatRepository.findMessageById(messageId);
    
    if (!existingMessage) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Message not found");
    }
    
    // Verify user is the sender
    if (existingMessage.sender.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You can only delete your own messages"
      );
    }
    
    // Soft delete message
    const deletedMessage = await chatRepository.updateMessage(messageId, {
      deleted: true,
      deletedAt: new Date(),
      status: MessageStatus.DELETED,
    });
    
    if (!deletedMessage) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to delete message"
      );
    }
    
    // Update conversation
    await ConversationModel.findByIdAndUpdate(deletedMessage.conversationId, {
      updatedAt: new Date(),
    });
    
    // Emit event
    this.eventEmitter.emit(ChatEvent.MESSAGE_DELETED, {
      messageId: deletedMessage._id.toString(),
      conversationId: deletedMessage.conversationId.toString(),
      senderId: userId,
      deletedAt: deletedMessage.deletedAt!,
    });
    
    return this.formatMessageResponse(deletedMessage);
  }

  async markSeen(
    userId: string,
    conversationId: string,
    messageIds: string[]
  ): Promise<void> {
    // Verify conversation exists and user is a participant
    const conversation = await chatRepository.findConversationById(
      conversationId
    );
    
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found");
    }
    
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You are not a participant in this conversation"
      );
    }
    
    // Mark messages as seen
    await chatRepository.markSeen(
      messageIds.map((id) => new Types.ObjectId(id)),
      userId
    );
    
    // Update conversation
    await ConversationModel.findByIdAndUpdate(conversationId, {
      updatedAt: new Date(),
    });
    
    // Emit event for each message
    for (const messageId of messageIds) {
      this.eventEmitter.emit(ChatEvent.MESSAGE_SEEN, {
        messageId,
        conversationId,
        userId,
        seenAt: new Date(),
      });
    }
  }

  async typingStart(userId: string, conversationId: string): Promise<void> {
    // Verify conversation exists and user is a participant
    const conversation = await chatRepository.findConversationById(
      conversationId
    );
    
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found");
    }
    
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You are not a participant in this conversation"
      );
    }
    
    // Set typing indicator in Redis (expires after 10 seconds)
    const key = `${CacheKey.TYPING_USERS}${conversationId}`;
    await this.redis.hset(key, userId, "1");
    await this.redis.expire(key, 10); // 10 second expiration
    
    // Emit typing event
    this.eventEmitter.emit(ChatEvent.USER_TYPING, {
      conversationId,
      userId,
      timestamp: new Date(),
    });
  }

  async typingStop(userId: string, conversationId: string): Promise<void> {
    // Verify conversation exists and user is a participant
    const conversation = await chatRepository.findConversationById(
      conversationId
    );
    
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found");
    }
    
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You are not a participant in this conversation"
      );
    }
    
    // Remove typing indicator from Redis
    const key = `${CacheKey.TYPING_USERS}${conversationId}`;
    await this.redis.hdel(key, userId);
    
    // Emit stop typing event
    this.eventEmitter.emit(ChatEvent.USER_STOPPED_TYPING, {
      conversationId,
      userId,
      timestamp: new Date(),
    });
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedMessagesResponse> {
    // Verify conversation exists and user is a participant
    const conversation = await chatRepository.findConversationById(
      conversationId
    );
    
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found");
    }
    
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You are not a participant in this conversation"
      );
    }
    
    // Get messages
    const { messages, hasMore, nextCursor } = await chatRepository.findMessages(
      conversationId,
      limit,
      cursor
    );
    
    // Format responses
    const formattedMessages = messages.map(this.formatMessageResponse);
    
    return {
      messages: formattedMessages,
      hasMore,
      nextCursor,
    };
  }

  private formatConversationResponse(
    conversation: IConversation
  ): ConversationResponse {
    return {
      id: conversation._id.toString(),
      bottleId: conversation.bottleId.toString(),
      participants: conversation.participants.map((p) => p.toString()),
      status: conversation.status,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt || null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      unreadCount: 0, // Will be set by caller
    };
  }

  private formatMessageResponse(message: IMessage): MessageResponse {
    return {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      sender: message.sender.toString(),
      receiver: message.receiver.toString(),
      message: message.message,
      messageType: message.messageType,
      attachments: message.attachments,
      status: message.status,
      edited: message.edited,
      editedAt: message.editedAt || null,
      deleted: message.deleted,
      seenAt: message.seenAt || null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}

export const chatService = new ChatService(
  new EventEmitter(),
  new (require("ioredis"))() as Redis, // Mock Redis
  console // Mock logger
);