import mongoose from 'mongoose';
import { DEFAULT_SETTINGS, VALID_THEMES, VALID_LANGUAGES } from '../constants/settings.constants.js';

const privacySchema = new mongoose.Schema({
  discoverable: {
    type: Boolean,
    default: DEFAULT_SETTINGS.privacy.discoverable
  },
  allowReplies: {
    type: Boolean,
    default: DEFAULT_SETTINGS.privacy.allowReplies
  },
  showOnlineStatus: {
    type: Boolean,
    default: DEFAULT_SETTINGS.privacy.showOnlineStatus
  },
  showLastSeen: {
    type: Boolean,
    default: DEFAULT_SETTINGS.privacy.showLastSeen
  }
}, { _id: false });

const notificationsSchema = new mongoose.Schema({
  bottleReceived: {
    type: Boolean,
    default: DEFAULT_SETTINGS.notifications.bottleReceived
  },
  messageReceived: {
    type: Boolean,
    default: DEFAULT_SETTINGS.notifications.messageReceived
  },
  achievementUnlocked: {
    type: Boolean,
    default: DEFAULT_SETTINGS.notifications.achievementUnlocked
  },
  securityAlerts: {
    type: Boolean,
    default: DEFAULT_SETTINGS.notifications.securityAlerts
  },
  push: {
    type: Boolean,
    default: DEFAULT_SETTINGS.notifications.push
  },
  email: {
    type: Boolean,
    default: DEFAULT_SETTINGS.notifications.email
  }
}, { _id: false });

const appearanceSchema = new mongoose.Schema({
  theme: {
    type: String,
    enum: VALID_THEMES,
    default: DEFAULT_SETTINGS.appearance.theme
  },
  language: {
    type: String,
    enum: VALID_LANGUAGES,
    default: DEFAULT_SETTINGS.appearance.language
  },
  reduceMotion: {
    type: Boolean,
    default: DEFAULT_SETTINGS.appearance.reduceMotion
  }
}, { _id: false });

const securitySchema = new mongoose.Schema({
  loginAlerts: {
    type: Boolean,
    default: DEFAULT_SETTINGS.security.loginAlerts
  },
  twoFactorEnabled: {
    type: Boolean,
    default: DEFAULT_SETTINGS.security.twoFactorEnabled
  }
}, { _id: false });

const dataPreferencesSchema = new mongoose.Schema({
  allowAnalytics: {
    type: Boolean,
    default: DEFAULT_SETTINGS.dataPreferences.allowAnalytics
  }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  privacy: privacySchema,
  notifications: notificationsSchema,
  appearance: appearanceSchema,
  security: securitySchema,
  dataPreferences: dataPreferencesSchema
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create indexes for performance
settingsSchema.index({ userId: 1 });

// Static method to create default settings for a user
settingsSchema.statics.createDefaultSettings = async function(userId) {
  return this.create({
    userId,
    privacy: DEFAULT_SETTINGS.privacy,
    notifications: DEFAULT_SETTINGS.notifications,
    appearance: DEFAULT_SETTINGS.appearance,
    security: DEFAULT_SETTINGS.security,
    dataPreferences: DEFAULT_SETTINGS.dataPreferences
  });
};

export const SettingsModel = mongoose.model('Settings', settingsSchema);