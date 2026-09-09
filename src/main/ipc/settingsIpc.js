const { ipcMain, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const settingsRepo = require('../database/repositories/settingsRepo');
const localStorageService = require('../services/localStorageService');
const messageRepo = require('../database/repositories/messageRepo');
const chatRepo = require('../database/repositories/chatRepo');
const config = require('../config');
const logger = require('../utils/logger');

function registerSettingsIpc() {
  // Get all settings
  ipcMain.handle('settings:getAll', async () => {
    try {
      const settings = settingsRepo.getAllSettings();
      return { success: true, settings };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Set single setting
  ipcMain.handle('settings:set', async (event, { key, value }) => {
    try {
      settingsRepo.setSetting(key, value);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get privacy settings
  ipcMain.handle('settings:getPrivacy', async (event, { userId }) => {
    try {
      const privacy = settingsRepo.getPrivacySettings(userId);
      return { success: true, privacy };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Update privacy settings
  ipcMain.handle('settings:updatePrivacy', async (event, { userId, updates }) => {
    try {
      const privacy = settingsRepo.updatePrivacySettings(userId, updates);
      return { success: true, privacy };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get storage usage
  ipcMain.handle('settings:getStorageUsage', async () => {
    try {
      const usage = localStorageService.getStorageUsage();
      return { success: true, usage };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Clear cache
  ipcMain.handle('settings:clearCache', async () => {
    try {
      const res = localStorageService.clearCache();
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Open Dry Chat folder in Windows Explorer
  ipcMain.handle('settings:openDryChatFolder', async () => {
    try {
      shell.openPath(config.paths.base);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Export chat
  ipcMain.handle('settings:exportChat', async (event, { chatId, format = 'txt' }) => {
    try {
      const chat = chatRepo.getChatById(chatId);
      const messages = messageRepo.getMessagesByChatId(chatId, 5000);

      const defaultFilename = `DryChat_${(chat ? chat.title : 'export').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;
      const saveDialog = await dialog.showSaveDialog({
        title: 'Export Chat History',
        defaultPath: defaultFilename,
        filters: format === 'json'
          ? [{ name: 'JSON Files', extensions: ['json'] }]
          : (format === 'html'
            ? [{ name: 'HTML Webpage', extensions: ['html'] }]
            : [{ name: 'Text Document', extensions: ['txt'] }])
      });

      if (saveDialog.canceled || !saveDialog.filePath) {
        return { canceled: true };
      }

      let fileContent = '';
      if (format === 'json') {
        fileContent = JSON.stringify({ chat, messages }, null, 2);
      } else if (format === 'html') {
        fileContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dry Chat Export - ${chat ? chat.title : 'Chat'}</title><style>body{font-family:Segoe UI,sans-serif;background:#121820;color:#fff;padding:24px;}.bubble{margin:8px 0;padding:12px;border-radius:12px;background:#18212b;max-width:70%;}.sender{font-weight:bold;color:#4da3ff;font-size:12px;}.time{font-size:10px;color:#888;margin-top:4px;}</style></head><body><h2>${chat ? chat.title : 'Chat'}</h2><div>${messages.map(m => `<div class="bubble"><div class="sender">${m.sender_name || m.sender_id}</div><div>${m.content}</div><div class="time">${new Date(m.created_at).toLocaleString()}</div></div>`).join('')}</div></body></html>`;
      } else {
        fileContent = `DRY CHAT EXPORT - ${chat ? chat.title : 'Chat'}\nExport Date: ${new Date().toLocaleString()}\n----------------------------------------\n\n`;
        for (const m of messages) {
          fileContent += `[${new Date(m.created_at).toLocaleString()}] ${m.sender_name || m.sender_id}: ${m.content}\n`;
        }
      }

      fs.writeFileSync(saveDialog.filePath, fileContent, 'utf8');
      return { success: true, filePath: saveDialog.filePath };
    } catch (err) {
      logger.error('Error exporting chat:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerSettingsIpc;
