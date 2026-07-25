import { Types } from "mongoose";

// Time range types for analytics
export enum TimeRange {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  CUSTOM = "custom",
}

// Metric categories
export enum MetricCategory {
  USERS = "users",
  BOTTLES = "bottles",
  CHATS = "chats",
  NOTIFICATIONS = "notifications",
  REPORTS = "reports",
  SYSTEM = "system",
}

// Queue names for BullMQ
export enum AnalyticsQueue {
  AGGREGATION = "AnalyticsAggregationQueue",
  SNAPSHOT = "DailySnapshotQueue",
  CLEANUP = "AnalyticsCleanupQueue",
}

// Job types
export enum AnalyticsJobType {
  AGGREGATE = "aggregate",
  SNAPSHOT = "snapshot",
  CLEANUP = "cleanup",
}

// Daily analytics interface
export interface IDailyAnalytics {
  _id: Types.ObjectId;
  date: Date;
  newUsers: number;
  activeUsers: number;
  onlineUsers: number;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  bottlesExpired: number;
  messagesSent: number;
  messagesRead: number;
  conversationsStarted: number;
  notificationsSent: number;
  reportsCreated: number;
  averageReplyTime: number; // in milliseconds
  averageDeliveryTime: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

// Weekly analytics (aggregated from daily)
export interface IWeeklyAnalytics {
  _id: Types.ObjectId;
  year: number;
  week: number; // ISO week number
  startDate: Date;
  endDate: Date;
  newUsers: number;
  activeUsers: number;
  avgOnlineUsers: number;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  bottlesExpired: number;
  messagesSent: number;
  messagesRead: number;
  conversationsStarted: number;
  notificationsSent: number;
  reportsCreated: number;
  avgReplyTime: number; // in milliseconds
  avgDeliveryTime: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

// Monthly analytics (aggregated from daily/weekly)
export interface IMonthlyAnalytics {
  _id: Types.ObjectId;
  year: number;
  month: number; // 1-12
  newUsers: number;
  activeUsers: number;
  avgOnlineUsers: number;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  bottlesExpired: number;
  messagesSent: number;
  messagesRead: number;
  conversationsStarted: number;
  notificationsSent: number;
  reportsCreated: number;
  avgReplyTime: number; // in milliseconds
  avgDeliveryTime: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

// Overview metrics (cached)
export interface IOverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalBottles: number;
  deliveredBottles: number;
  openedBottles: number;
  totalMessages: number;
  readMessages: number;
  totalConversations: number;
  activeConversations: number;
  replyRate: number; // percentage
  deliveryRate: number; // percentage
  avgReplyTime: number; // in milliseconds
  avgDeliveryTime: number; // in milliseconds
  lastUpdated: Date;
}

// Trend analysis interface
export interface ITrendAnalysis {
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  metrics: {
    [key in MetricCategory]?: {
      values: number[];
      dates: Date[];
      growthRate: number; // percentage
    };
  };
}

// User analytics interface
export interface IUserAnalytics {
  userId: string;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  messagesSent: number;
  messagesReceived: number;
  conversationsStarted: number;
  avgReplyTime: number; // in milliseconds
  lastActive: Date;
  joinDate: Date;
}

// DTOs for API requests
export interface GetAnalyticsDto {
  timeRange?: TimeRange;
  startDate?: Date;
  endDate?: Date;
  category?: MetricCategory | MetricCategory[];
  limit?: number;
}

// DTOs for API responses
export interface DailyAnalyticsResponse {
  id: string;
  date: string;
  newUsers: number;
  activeUsers: number;
  onlineUsers: number;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  bottlesExpired: number;
  messagesSent: number;
  messagesRead: number;
  conversationsStarted: number;
  notificationsSent: number;
  reportsCreated: number;
  averageReplyTime: number;
  averageDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyAnalyticsResponse {
  id: string;
  year: number;
  week: number;
  startDate: string;
  endDate: string;
  newUsers: number;
  activeUsers: number;
  avgOnlineUsers: number;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  bottlesExpired: number;
  messagesSent: number;
  messagesRead: number;
  conversationsStarted: number;
  notificationsSent: number;
  reportsCreated: number;
  avgReplyTime: number;
  avgDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyAnalyticsResponse {
  id: string;
  year: number;
  month: number;
  newUsers: number;
  activeUsers: number;
  avgOnlineUsers: number;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  bottlesExpired: number;
  messagesSent: number;
  messagesRead: number;
  conversationsStarted: number;
  notificationsSent: number;
  reportsCreated: number;
  avgReplyTime: number;
  avgDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface OverviewMetricsResponse {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalBottles: number;
  deliveredBottles: number;
  openedBottles: number;
  totalMessages: number;
  readMessages: number;
  totalConversations: number;
  activeConversations: number;
  replyRate: number;
  deliveryRate: number;
  avgReplyTime: number;
  avgDeliveryTime: number;
  lastUpdated: string;
}

export interface TrendAnalysisResponse {
  timeRange: TimeRange;
  startDate: string;
  endDate: string;
  metrics: Record<
    string,
    {
      values: number[];
      dates: string[];
      growthRate: number;
    }
  >;
}

export interface UserAnalyticsResponse {
  userId: string;
  bottlesCreated: number;
  bottlesDelivered: number;
  bottlesOpened: number;
  messagesSent: number;
  messagesReceived: number;
  conversationsStarted: number;
  avgReplyTime: number;
  lastActive: string;
  joinDate: string;
}

// Job data interfaces
export interface AggregationJobData {
  type: AnalyticsJobType.AGGREGATE;
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface SnapshotJobData {
  type: AnalyticsJobType.SNAPSHOT;
  date: Date;
  createdAt: Date;
}

export interface CleanupJobData {
  type: AnalyticsJobType.CLEANUP;
  cutoffDate: Date;
  createdAt: Date;
}

export type AnalyticsJobData =
  | AggregationJobData
  | SnapshotJobData
  | CleanupJobData;

// Event payloads from other modules
export interface UserRegisteredEvent {
  userId: string;
  createdAt: Date;
}

export interface UserActiveEvent {
  userId: string;
  timestamp: Date;
}

export interface UserOnlineEvent {
  userId: string;
  timestamp: Date;
}

export interface BottleCreatedEvent {
  bottleId: string;
  userId: string;
  createdAt: Date;
}

export interface BottleDeliveredEvent {
  bottleId: string;
  deliveredAt: Date;
  deliveryTime: number; // milliseconds
}

export interface BottleOpenedEvent {
  bottleId: string;
  openedAt: Date;
}

export interface BottleExpiredEvent {
  bottleId: string;
  expiredAt: Date;
}

export interface ConversationStartedEvent {
  conversationId: string;
  startedAt: Date;
}

export interface MessageSentEvent {
  messageId: string;
  conversationId: string;
  senderId: string;
  sentAt: Date;
}

export interface MessageReadEvent {
  messageId: string;
  readAt: Date;
  replyTime: number; // milliseconds since sent
}

export interface NotificationSentEvent {
  notificationId: string;
  sentAt: Date;
}

export interface ReportCreatedEvent {
  reportId: string;
  createdAt: Date;
}

// Union type for all external events
export type ExternalEvent =
  | UserRegisteredEvent
  | UserActiveEvent
  | UserOnlineEvent
  | BottleCreatedEvent
  | BottleDeliveredEvent
  | BottleOpenedEvent
  | BottleExpiredEvent
  | ConversationStartedEvent
  | MessageSentEvent
  | MessageReadEvent
  | NotificationSentEvent
  | ReportCreatedEvent;

// Redis cache keys
export enum CacheKey {
  OVERVIEW_METRICS = "analytics:overview",
  TREND_ANALYSIS = "analytics:trends:",
  USER_ANALYTICS = "analytics:user:",
  DAILY_SNAPSHOT = "analytics:daily:",
}