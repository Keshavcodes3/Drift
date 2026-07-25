import { settingsService } from '../services/settings.service.js';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../../common/utils/app.error.js';
import { asyncHandler } from '../../../common/utils/async.handler.js';

class SettingsController {
  constructor() {
    // Bind methods for proper 'this' context
    this.getSettings = this.getSettings.bind(this);
    this.updatePrivacy = this.updatePrivacy.bind(this);
    this.updateNotifications = this.updateNotifications.bind(this);
    this.updateAppearance = this.updateAppearance.bind(this);
    this.updateSecurity = this.updateSecurity.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
  }

  async getSettings(req, res) {
    const settings = await settingsService.getSettings(req.user.id);
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    });
  }

  async updatePrivacy(req, res) {
    const updatedSettings = await settingsService.updatePrivacy(
      req.user.id,
      req.body
    );
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: updatedSettings
    });
  }

  async updateNotifications(req, res) {
    const updatedSettings = await settingsService.updateNotifications(
      req.user.id,
      req.body
    );
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: updatedSettings
    });
  }

  async updateAppearance(req, res) {
    const updatedSettings = await settingsService.updateAppearance(
      req.user.id,
      req.body
    );
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Appearance settings updated successfully',
      data: updatedSettings
    });
  }

  async updateSecurity(req, res) {
    const updatedSettings = await settingsService.updateSecurity(
      req.user.id,
      req.body
    );
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Security settings updated successfully',
      data: updatedSettings
    });
  }

  async resetSettings(req, res) {
    const defaultSettings = await settingsService.resetSettings(req.user.id);
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Settings reset to default values',
      data: defaultSettings
    });
  }
}

// Wrap all controller methods with asyncHandler for error handling
export const settingsController = {
  getSettings: asyncHandler(new SettingsController().getSettings),
  updatePrivacy: asyncHandler(new SettingsController().updatePrivacy),
  updateNotifications: asyncHandler(new SettingsController().updateNotifications),
  updateAppearance: asyncHandler(new SettingsController().updateAppearance),
  updateSecurity: asyncHandler(new SettingsController().updateSecurity),
  resetSettings: asyncHandler(new SettingsController().resetSettings)
};