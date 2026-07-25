import { SettingsModel } from '../models/settings.model.js';
import { DEFAULT_SETTINGS, CACHE_KEY_PREFIX, CACHE_TTL, SETTINGS_EVENTS } from '../constants/settings.constants.js';
import { validateSettingsSection } from '../validators/settings.validator.js';
import { eventEmitter } from '../../../infrastructure/events/event.emitter.js';
import { redisClient } from '../../../infrastructure/redis/redis.client.js';
import { AppError } from '../../../common/utils/app.error.js';
import { StatusCodes } from 'http-status-codes';

class SettingsService {
  constructor() {
    // Bind methods for proper 'this' context
    this.getSettings = this.getSettings.bind(this);
    this.updatePrivacy = this.updatePrivacy.bind(this);
    this.updateNotifications = this.updateNotifications.bind(this);
    this.updateAppearance = this.updateAppearance.bind(this);
    this.updateSecurity = this.updateSecurity.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
  }

  async getSettings(userId) {
    // Try to get from cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cachedSettings = await redisClient.get(cacheKey);

    if (cachedSettings) {
      return JSON.parse(cachedSettings);
    }

    // Find settings in database
    let settings = await SettingsModel.findOne({ userId }).lean();

    // Create default settings if they don't exist
    if (!settings) {
      settings = await SettingsModel.createDefaultSettings(userId);
    }

    // Cache the settings
    await redisClient.setex(
      cacheKey,
      CACHE_TTL,
      JSON.stringify(settings)
    );

    return settings;
  }

  async updatePrivacy(userId, privacyData) {
    // Validate input
    const validatedData = validateSettingsSection('privacy', privacyData);

    // Update in database
    const updatedSettings = await SettingsModel.findOneAndUpdate(
      { userId },
      { $set: { privacy: validatedData } },
      { new: true, upsert: true }
    );

    if (!updatedSettings) {
      throw new AppError(
        'Failed to update privacy settings',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Invalidate cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redisClient.del(cacheKey);

    // Emit event
    eventEmitter.emit(SETTINGS_EVENTS.UPDATED, {
      userId,
      changedSection: 'privacy',
      changes: validatedData,
      timestamp: new Date()
    });

    return updatedSettings;
  }

  async updateNotifications(userId, notificationsData) {
    // Validate input
    const validatedData = validateSettingsSection('notifications', notificationsData);

    // Update in database
    const updatedSettings = await SettingsModel.findOneAndUpdate(
      { userId },
      { $set: { notifications: validatedData } },
      { new: true, upsert: true }
    );

    if (!updatedSettings) {
      throw new AppError(
        'Failed to update notification settings',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Invalidate cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redisClient.del(cacheKey);

    // Emit event
    eventEmitter.emit(SETTINGS_EVENTS.UPDATED, {
      userId,
      changedSection: 'notifications',
      changes: validatedData,
      timestamp: new Date()
    });

    return updatedSettings;
  }

  async updateAppearance(userId, appearanceData) {
    // Validate input
    const validatedData = validateSettingsSection('appearance', appearanceData);

    // Update in database
    const updatedSettings = await SettingsModel.findOneAndUpdate(
      { userId },
      { $set: { appearance: validatedData } },
      { new: true, upsert: true }
    );

    if (!updatedSettings) {
      throw new AppError(
        'Failed to update appearance settings',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Invalidate cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redisClient.del(cacheKey);

    // Emit event
    eventEmitter.emit(SETTINGS_EVENTS.UPDATED, {
      userId,
      changedSection: 'appearance',
      changes: validatedData,
      timestamp: new Date()
    });

    return updatedSettings;
  }

  async updateSecurity(userId, securityData) {
    // Validate input
    const validatedData = validateSettingsSection('security', securityData);

    // Update in database
    const updatedSettings = await SettingsModel.findOneAndUpdate(
      { userId },
      { $set: { security: validatedData } },
      { new: true, upsert: true }
    );

    if (!updatedSettings) {
      throw new AppError(
        'Failed to update security settings',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Invalidate cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redisClient.del(cacheKey);

    // Emit event
    eventEmitter.emit(SETTINGS_EVENTS.UPDATED, {
      userId,
      changedSection: 'security',
      changes: validatedData,
      timestamp: new Date()
    });

    return updatedSettings;
  }

  async resetSettings(userId) {
    // Delete existing settings
    await SettingsModel.deleteOne({ userId });

    // Create new default settings
    const defaultSettings = await SettingsModel.createDefaultSettings(userId);

    // Invalidate cache
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redisClient.del(cacheKey);

    // Emit event
    eventEmitter.emit(SETTINGS_EVENTS.UPDATED, {
      userId,
      changedSection: 'all',
      changes: DEFAULT_SETTINGS,
      timestamp: new Date()
    });

    return defaultSettings;
  }
}

export const settingsService = new SettingsService();