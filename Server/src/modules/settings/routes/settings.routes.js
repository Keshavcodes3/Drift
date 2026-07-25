import express from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { validate } from '../../../common/middlewares/validate.middleware.js';
import { privacyValidator, notificationsValidator, appearanceValidator, securityValidator } from '../validators/settings.validator.js';
import { authMiddleware } from '../../../common/middlewares/auth.middleware.js';
import { rateLimiter } from '../../../common/middlewares/rate.limiter.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting to prevent abuse
router.use(rateLimiter(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Get user settings
router.get('/', settingsController.getSettings);

// Update privacy settings
router.patch(
  '/privacy',
  validate({ body: privacyValidator }),
  settingsController.updatePrivacy
);

// Update notification settings
router.patch(
  '/notifications',
  validate({ body: notificationsValidator }),
  settingsController.updateNotifications
);

// Update appearance settings
router.patch(
  '/appearance',
  validate({ body: appearanceValidator }),
  settingsController.updateAppearance
);

// Update security settings
router.patch(
  '/security',
  validate({ body: securityValidator }),
  settingsController.updateSecurity
);

// Reset settings to defaults
router.post('/reset', settingsController.resetSettings);

export default router;