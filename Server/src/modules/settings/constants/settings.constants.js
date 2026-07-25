// Default settings values
export const DEFAULT_SETTINGS = {
  privacy: {
    discoverable: true,
    allowReplies: true,
    showOnlineStatus: true,
    showLastSeen: true
  },
  notifications: {
    bottleReceived: true,
    messageReceived: true,
    achievementUnlocked: true,
    securityAlerts: true,
    push: true,
    email: false
  },
  appearance: {
    theme: 'system',
    language: 'en',
    reduceMotion: false
  },
  security: {
    loginAlerts: true,
    twoFactorEnabled: false
  },
  dataPreferences: {
    allowAnalytics: true
  }
};

// Valid values for settings
export const VALID_THEMES = ['light', 'dark', 'system'];
export const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'];

// Cache configuration
export const CACHE_KEY_PREFIX = 'settings:';
export const CACHE_TTL = 30 * 60; // 30 minutes in seconds

// Event names
export const SETTINGS_EVENTS = {
  UPDATED: 'settings.updated'
};