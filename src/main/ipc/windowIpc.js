const { ipcMain, app } = require('electron');
const trayService = require('../services/trayService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

function registerWindowIpc(mainWindow) {

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  // Close button → hide to tray (not quit)
  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Tray / Auto-start controls
  ipcMain.handle('window:getAutoLaunch', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('window:setAutoLaunch', (event, { enabled }) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      name: 'Dry Chat',
      args: ['--hidden']
    });
    logger.info(`Auto-launch ${enabled ? 'enabled' : 'disabled'}.`);
    return { success: true, enabled };
  });

  ipcMain.handle('window:setMuteNotifications', (event, { muted }) => {
    notificationService.setMuted(muted);
    return { success: true };
  });

  ipcMain.handle('window:showWindow', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.handle('window:hideToTray', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.handle('window:quitApp', () => {
    app.quit();
  });

  ipcMain.handle('window:setTrayUnread', (event, { count }) => {
    trayService.setUnreadCount(count || 0);
    return { success: true };
  });
}

module.exports = registerWindowIpc;
