import { SETTINGS_EVENTS } from '../constants/settings.constants.js';
import { eventEmitter } from '../../../infrastructure/events/event.emitter.js';
import { logger } from '../../../infrastructure/logger/logger.js';

class SettingsEventHandler {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    eventEmitter.on(SETTINGS_EVENTS.UPDATED, (payload) => {
      this.handleSettingsUpdated(payload);
    });
  }

  handleSettingsUpdated({ userId, changedSection, changes, timestamp }) {
    // Log the event for debugging and analytics
    logger.info({
      event: SETTINGS_EVENTS.UPDATED,
      userId,
      changedSection,
      changes: JSON.stringify(changes),
      timestamp: timestamp.toISOString()
    });

    // Here you would typically:
    // 1. Publish to other services via event bus
    // 2. Update presence status if privacy settings changed
    // 3. Update notification preferences in notification service
    // 4. Update analytics with new preferences
    
    // Example: Update presence status if online status visibility changed
    if (changedSection === 'privacy' && 'showOnlineStatus' in changes) {
      // Emit event for presence service to update user's online status visibility
      eventEmitter.emit('presence.statusVisibilityChanged', {
        userId,
        showOnlineStatus: changes.showOnlineStatus,
        timestamp
      });
    }
    
    // Example: Update notification service if notification preferences changed
    if (changedSection === 'notifications') {
      eventEmitter.emit('notifications.preferencesUpdated', {
        userId,
        preferences: changes,
        timestamp
      });
    }
  }
}

// Initialize the event handler
const settingsEventHandler = new SettingsEventHandler();

export default settingsEventHandler;