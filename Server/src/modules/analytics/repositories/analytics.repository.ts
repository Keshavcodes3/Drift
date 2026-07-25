import { DailyAnalyticsModel } from "../models/daily-analytics.model";
import { WeeklyAnalyticsModel } from "../models/weekly-analytics.model";
import { MonthlyAnalyticsModel } from "../models/monthly-analytics.model";
import {
  IDailyAnalytics,
  IWeeklyAnalytics,
  IMonthlyAnalytics,
  IOverviewMetrics,
  ITrendAnalysis,
  IUserAnalytics,
  TimeRange,
  MetricCategory,
} from "../analytics.types";
import { Types } from "mongoose";

class AnalyticsRepository {
  async createDailySnapshot(
    date: Date,
    data: Partial<IDailyAnalytics>
  ): Promise<IDailyAnalytics> {
    return DailyAnalyticsModel.upsertDailyAnalytics(date, data);
  }

  async incrementDailyCounters(
    date: Date,
    increments: Partial<Record<keyof IDailyAnalytics, number>>
  ): Promise<IDailyAnalytics> {
    return DailyAnalyticsModel.incrementCounters(date, increments);
  }

  async findDailyByDate(
    date: Date
  ): Promise<IDailyAnalytics | null> {
    return DailyAnalyticsModel.findOne({ date }).lean<IDailyAnalytics>();
  }

  async findDailyRange(
    startDate: Date,
    endDate: Date
  ): Promise<IDailyAnalytics[]> {
    return DailyAnalyticsModel.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 }) // Chronological order
      .lean<IDailyAnalytics[]>();
  }

  async createWeeklySnapshot(
    year: number,
    week: number,
    startDate: Date,
    endDate: Date,
    data: Partial<IWeeklyAnalytics>
  ): Promise<IWeeklyAnalytics> {
    const doc = await WeeklyAnalyticsModel.findOneAndUpdate(
      { year, week },
      { $set: { ...data, startDate, endDate } },
      { upsert: true, new: true }
    );
    return doc.toObject();
  }

  async findWeeklyByYearWeek(
    year: number,
    week: number
  ): Promise<IWeeklyAnalytics | null> {
    return WeeklyAnalyticsModel.findOne({ year, week }).lean<IWeeklyAnalytics>();
  }

  async findWeeklyRange(
    startDate: Date,
    endDate: Date
  ): Promise<IWeeklyAnalytics[]> {
    return WeeklyAnalyticsModel.find({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    })
      .sort({ startDate: 1 }) // Chronological order
      .lean<IWeeklyAnalytics[]>();
  }

  async createMonthlySnapshot(
    year: number,
    month: number,
    data: Partial<IMonthlyAnalytics>
  ): Promise<IMonthlyAnalytics> {
    const doc = await MonthlyAnalyticsModel.findOneAndUpdate(
      { year, month },
      { $set: data },
      { upsert: true, new: true }
    );
    return doc.toObject();
  }

  async findMonthlyByYearMonth(
    year: number,
    month: number
  ): Promise<IMonthlyAnalytics | null> {
    return MonthlyAnalyticsModel.findOne({ year, month }).lean<IMonthlyAnalytics>();
  }

  async findMonthlyRange(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<IMonthlyAnalytics[]> {
    // Convert to comparable dates for range query
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0); // Last day of end month
    
    // Find all months that overlap with this range
    const months = [];
    for (let year = startYear; year <= endYear; year++) {
      const startM = year === startYear ? startMonth : 1;
      const endM = year === endYear ? endMonth : 12;
      
      for (let month = startM; month <= endM; month++) {
        months.push({ year, month });
      }
    }
    
    return MonthlyAnalyticsModel.find({
      $or: months.map((m) => ({ year: m.year, month: m.month })),
    })
      .sort({ year: 1, month: 1 }) // Chronological order
      .lean<IMonthlyAnalytics[]>();
  }

  async aggregateUsers(
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    new: number;
    active: number;
    avgOnline: number;
  }> {
    const [daily, weekly] = await Promise.all([
      DailyAnalyticsModel.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalNewUsers: { $sum: "$newUsers" },
            totalActiveUsers: { $sum: "$activeUsers" },
            totalOnlineUsers: { $sum: "$onlineUsers" },
            count: { $sum: 1 },
          },
        },
      ]),
      WeeklyAnalyticsModel.aggregate([
        {
          $match: {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            avgOnlineUsers: { $avg: "$avgOnlineUsers" },
          },
        },
      ]),
    ]);
    
    const dailyData = daily[0] || {
      totalNewUsers: 0,
      totalActiveUsers: 0,
      totalOnlineUsers: 0,
      count: 0,
    };
    const weeklyData = weekly[0] || { avgOnlineUsers: 0 };
    
    return {
      total: dailyData.totalNewUsers,
      new: dailyData.totalNewUsers,
      active: dailyData.totalActiveUsers,
      avgOnline: weeklyData.avgOnlineUsers || dailyData.totalOnlineUsers / Math.max(1, dailyData.count),
    };
  }

  async aggregateBottles(
    startDate: Date,
    endDate: Date
  ): Promise<{
    created: number;
    delivered: number;
    opened: number;
    expired: number;
    deliveryRate: number;
    openRate: number;
    avgDeliveryTime: number;
  }> {
    const [daily, weekly] = await Promise.all([
      DailyAnalyticsModel.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalCreated: { $sum: "$bottlesCreated" },
            totalDelivered: { $sum: "$bottlesDelivered" },
            totalOpened: { $sum: "$bottlesOpened" },
            totalExpired: { $sum: "$bottlesExpired" },
            totalDeliveryTime: { $sum: "$averageDeliveryTime" },
            count: { $sum: 1 },
          },
        },
      ]),
      WeeklyAnalyticsModel.aggregate([
        {
          $match: {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: "$avgDeliveryTime" },
          },
        },
      ]),
    ]);
    
    const dailyData = daily[0] || {
      totalCreated: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalExpired: 0,
      totalDeliveryTime: 0,
      count: 0,
    };
    const weeklyData = weekly[0] || { avgDeliveryTime: 0 };
    
    const deliveryRate =
      dailyData.totalCreated > 0
        ? (dailyData.totalDelivered / dailyData.totalCreated) * 100
        : 0;
    
    const openRate =
      dailyData.totalDelivered > 0
        ? (dailyData.totalOpened / dailyData.totalDelivered) * 100
        : 0;
    
    return {
      created: dailyData.totalCreated,
      delivered: dailyData.totalDelivered,
      opened: dailyData.totalOpened,
      expired: dailyData.totalExpired,
      deliveryRate,
      openRate,
      avgDeliveryTime: weeklyData.avgDeliveryTime ||
        (dailyData.totalDeliveryTime / Math.max(1, dailyData.count)),
    };
  }

  async aggregateChats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    messagesSent: number;
    messagesRead: number;
    conversationsStarted: number;
    readRate: number;
    avgReplyTime: number;
  }> {
    const [daily, weekly] = await Promise.all([
      DailyAnalyticsModel.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalMessagesSent: { $sum: "$messagesSent" },
            totalMessagesRead: { $sum: "$messagesRead" },
            totalConversations: { $sum: "$conversationsStarted" },
            totalReplyTime: { $sum: "$averageReplyTime" },
            count: { $sum: 1 },
          },
        },
      ]),
      WeeklyAnalyticsModel.aggregate([
        {
          $match: {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            avgReplyTime: { $avg: "$avgReplyTime" },
          },
        },
      ]),
    ]);
    
    const dailyData = daily[0] || {
      totalMessagesSent: 0,
      totalMessagesRead: 0,
      totalConversations: 0,
      totalReplyTime: 0,
      count: 0,
    };
    const weeklyData = weekly[0] || { avgReplyTime: 0 };
    
    const readRate =
      dailyData.totalMessagesSent > 0
        ? (dailyData.totalMessagesRead / dailyData.totalMessagesSent) * 100
        : 0;
    
    return {
      messagesSent: dailyData.totalMessagesSent,
      messagesRead: dailyData.totalMessagesRead,
      conversationsStarted: dailyData.totalConversations,
      readRate,
      avgReplyTime: weeklyData.avgReplyTime ||
        (dailyData.totalReplyTime / Math.max(1, dailyData.count)),
    };
  }

  async aggregateNotifications(
    startDate: Date,
    endDate: Date
  ): Promise<{
    sent: number;
    avgPerUser: number;
  }> {
    const [daily, userCount] = await Promise.all([
      DailyAnalyticsModel.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalSent: { $sum: "$notificationsSent" },
          },
        },
      ]),
      DailyAnalyticsModel.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            uniqueUsers: { $addToSet: "$date" },
            totalUsers: { $sum: "$activeUsers" },
          },
        },
        {
          $project: {
            uniqueDays: { $size: "$uniqueUsers" },
            totalUsers: 1,
          },
        },
      ]),
    ]);
    
    const dailyData = daily[0] || { totalSent: 0 };
    const userData = userCount[0] || { totalUsers: 0, uniqueDays: 0 };
    
    const avgUsersPerDay = userData.uniqueDays > 0
      ? userData.totalUsers / userData.uniqueDays
      : 0;
    
    return {
      sent: dailyData.totalSent,
      avgPerUser: avgUsersPerDay > 0 ? dailyData.totalSent / avgUsersPerDay : 0,
    };
  }

  async aggregateReports(
    startDate: Date,
    endDate: Date
  ): Promise<{
    created: number;
    ratePerThousand: number;
  }> {
    const [daily, userData] = await Promise.all([
      DailyAnalyticsModel.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalReports: { $sum: "$reportsCreated" },
            totalUsers: { $sum: "$activeUsers" },
          },
        },
      ]),
    ]);
    
    const data = daily[0] || { totalReports: 0, totalUsers: 0 };
    
    return {
      created: data.totalReports,
      ratePerThousand: data.totalUsers > 0
        ? (data.totalReports / data.totalUsers) * 1000
        : 0,
    };
  }

  async getOverviewMetrics(
    days: number = 30
  ): Promise<IOverviewMetrics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const [users, bottles, chats, notifications, reports] = await Promise.all([
      this.aggregateUsers(startDate, endDate),
      this.aggregateBottles(startDate, endDate),
      this.aggregateChats(startDate, endDate),
      this.aggregateNotifications(startDate, endDate),
      this.aggregateReports(startDate, endDate),
    ]);
    
    return {
      totalUsers: users.total,
      activeUsers: users.active,
      onlineUsers: users.avgOnline,
      totalBottles: bottles.created,
      deliveredBottles: bottles.delivered,
      openedBottles: bottles.opened,
      totalMessages: chats.messagesSent,
      readMessages: chats.messagesRead,
      totalConversations: chats.conversationsStarted,
      activeConversations: chats.conversationsStarted, // Simplified for overview
      replyRate: chats.readRate,
      deliveryRate: bottles.deliveryRate,
      avgReplyTime: chats.avgReplyTime,
      avgDeliveryTime: bottles.avgDeliveryTime,
      lastUpdated: new Date(),
    };
  }

  async getTrendAnalysis(
    category: MetricCategory,
    timeRange: TimeRange,
    startDate: Date,
    endDate: Date
  ): Promise<ITrendAnalysis> {
    let aggregation: any[] = [];
    let groupField: string;
    
    // Determine the aggregation pipeline based on time range
    switch (timeRange) {
      case TimeRange.DAILY:
        aggregation = [
          { $match: { date: { $gte: startDate, $lte: endDate } } },
          { $sort: { date: 1 } },
          {
            $group: {
              _id: "$date",
              date: { $first: "$date" },
              ...this.getMetricProjection(category),
            },
          },
          { $sort: { date: 1 } },
        ];
        groupField = "date";
        break;
      
      case TimeRange.WEEKLY:
        aggregation = [
          {
            $match: {
              startDate: { $lte: endDate },
              endDate: { $gte: startDate },
            },
          },
          { $sort: { startDate: 1 } },
          {
            $group: {
              _id: "$week",
              date: { $first: "$startDate" },
              ...this.getMetricProjection(category),
            },
          },
          { $sort: { date: 1 } },
        ];
        groupField = "week";
        break;
      
      case TimeRange.MONTHLY:
        aggregation = [
          {
            $match: {
              year: { $gte: startDate.getFullYear() },
              month: { $gte: startDate.getMonth() + 1 },
              $expr: {
                $or: [
                  { $gt: [{ $year: "$endDate" }, startDate.getFullYear()] },
                  {
                    $and: [
                      { $eq: [{ $year: "$endDate" }, startDate.getFullYear()] },
                      { $gte: [{ $month: "$endDate" }, startDate.getMonth() + 1] },
                    ],
                  },
                ],
              },
            },
          },
          { $sort: { year: 1, month: 1 } },
          {
            $group: {
              _id: { year: "$year", month: "$month" },
              date: { $first: { $dateFromParts: { year: "$year", month: "$month", day: 1 } } },
              ...this.getMetricProjection(category),
            },
          },
          { $sort: { date: 1 } },
        ];
        groupField = "month";
        break;
      
      default: // CUSTOM range - use daily data
        aggregation = [
          { $match: { date: { $gte: startDate, $lte: endDate } } },
          { $sort: { date: 1 } },
          {
            $group: {
              _id: "$date",
              date: { $first: "$date" },
              ...this.getMetricProjection(category),
            },
          },
          { $sort: { date: 1 } },
        ];
        groupField = "date";
    }
    
    // Execute the aggregation
    const model = this.getModelForTimeRange(timeRange);
    const results = await model.aggregate(aggregation);
    
    // Calculate growth rate
    let growthRate = 0;
    if (results.length > 1) {
      const firstValue = results[0].value || 0;
      const lastValue = results[results.length - 1].value || 0;
      growthRate = firstValue > 0
        ? ((lastValue - firstValue) / firstValue) * 100
        : lastValue > 0 ? 100 : 0;
    }
    
    return {
      timeRange,
      startDate,
      endDate,
      metrics: {
        [category]: {
          values: results.map((r) => r.value || 0),
          dates: results.map((r) => r.date),
          growthRate,
        },
      },
    };
  }

  async getUserAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IUserAnalytics> {
    // This would query the actual user activity in a real implementation
    // For this example, we'll return mock data
    return {
      userId,
      bottlesCreated: 0,
      bottlesDelivered: 0,
      bottlesOpened: 0,
      messagesSent: 0,
      messagesReceived: 0,
      conversationsStarted: 0,
      avgReplyTime: 0,
      lastActive: new Date(),
      joinDate: new Date(),
    };
  }

  private getModelForTimeRange(timeRange: TimeRange) {
    switch (timeRange) {
      case TimeRange.DAILY:
        return DailyAnalyticsModel;
      case TimeRange.WEEKLY:
        return WeeklyAnalyticsModel;
      case TimeRange.MONTHLY:
        return MonthlyAnalyticsModel;
      default:
        return DailyAnalyticsModel;
    }
  }

  private getMetricProjection(category: MetricCategory): any {
    switch (category) {
      case MetricCategory.USERS:
        return { value: { $sum: "$newUsers" } };
      case MetricCategory.BOTTLES:
        return { value: { $sum: "$bottlesCreated" } };
      case MetricCategory.CHATS:
        return { value: { $sum: "$messagesSent" } };
      case MetricCategory.NOTIFICATIONS:
        return { value: { $sum: "$notificationsSent" } };
      case MetricCategory.REPORTS:
        return { value: { $sum: "$reportsCreated" } };
      default:
        return { value: { $sum: 1 } };
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();