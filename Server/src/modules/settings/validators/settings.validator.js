import { z } from 'zod';
import { VALID_THEMES, VALID_LANGUAGES } from '../constants/settings.constants.js';

// Base schema for partial updates
const partialBooleanSchema = z.boolean().optional();

// Privacy settings validator
export const privacyValidator = z.object({
  discoverable: partialBooleanSchema,
  allowReplies: partialBooleanSchema,
  showOnlineStatus: partialBooleanSchema,
  showLastSeen: partialBooleanSchema
}).partial();

// Notifications settings validator
export const notificationsValidator = z.object({
  bottleReceived: partialBooleanSchema,
  messageReceived: partialBooleanSchema,
  achievementUnlocked: partialBooleanSchema,
  securityAlerts: partialBooleanSchema,
  push: partialBooleanSchema,
  email: partialBooleanSchema
}).partial();

// Appearance settings validator
export const appearanceValidator = z.object({
  theme: z.enum(VALID_THEMES).optional(),
  language: z.enum(VALID_LANGUAGES).optional(),
  reduceMotion: partialBooleanSchema
}).partial();

// Security settings validator
export const securityValidator = z.object({
  loginAlerts: partialBooleanSchema,
  twoFactorEnabled: partialBooleanSchema
}).partial();

// Complete settings validator (for internal use)
export const completeSettingsValidator = z.object({
  privacy: privacyValidator,
  notifications: notificationsValidator,
  appearance: appearanceValidator,
  security: securityValidator,
  dataPreferences: z.object({
    allowAnalytics: partialBooleanSchema
  }).partial()
}).partial();

// Validate a specific settings section
export function validateSettingsSection(section, data) {
  switch (section) {
    case 'privacy':
      return privacyValidator.parse(data);
    case 'notifications':
      return notificationsValidator.parse(data);
    case 'appearance':
      return appearanceValidator.parse(data);
    case 'security':
      return securityValidator.parse(data);
    default:
      throw new Error(`Unknown settings section: ${section}`);
  }
}