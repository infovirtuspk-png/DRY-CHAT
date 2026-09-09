const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');
const localStorageService = require('./services/localStorageService');
const dbService = require('./database/index');
const firebaseService = require('./services/firebaseService');
const mediaExpirationService = require('./services/mediaExpirationService');
const syncService = require('./services/syncService');
const notificationService = require('./services/notificationService');
const trayService = require('./services/trayService');
const { registerAllIpc } = require('./ipc/index');
const logger = require('./utils/logger');

let mainWindow = null;
let isQuitting = false;

// ─── Single Instance Lock ────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── Auto-start at Windows Login ────────────────────────────────────────────
function setupAutoLaunch() {
  const settings = app.getLoginItemSettings();
  if (!settings.openAtLogin) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,        // Start minimized to tray
      name: 'Dry Chat',
      args: ['--hidden']         // Flag to start hidden
    });
    logger.info('Auto-launch at Windows startup enabled.');
  }
}

// ─── Create Main Window ──────────────────────────────────────────────────────
async function createWindow() {
  const startHidden = process.argv.includes('--hidden') ||
    app.getLoginItemSettings().wasOpenedAsHidden;

  mainWindow = new BrowserWindow({
    width: config.app.defaultWidth,
    height: config.app.defaultHeight,
    minWidth: config.app.minWidth,
    minHeight: config.app.minHeight,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0B0F14',
    show: false,
    skipTaskbar: false,
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Wire services to window
  notificationService.setMainWindow(mainWindow);
  notificationService.setTrayService(trayService);
  trayService.init(mainWindow);

  // Sync broadcast
  syncService.setBroadcastHandler((channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  });

  // Register all IPC
  registerAllIpc(mainWindow);

  // Load app
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (startHidden) {
      logger.info('Starting hidden in system tray (auto-launch mode).');
    } else {
      mainWindow.show();
      mainWindow.focus();
      logger.info('Dry Chat Main Window displayed.');
    }
  });

  // ── Intercept close → minimize to tray instead of quit ──
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      trayService.showIncomingMessageBalloon(
        'Dry Chat',
        'Running in background. Click tray icon to reopen.',
        null
      );
      logger.info('Window hidden to system tray.');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Clear unread when window gains focus
  mainWindow.on('focus', () => {
    notificationService.clearUnread();
  });

  // ── Tray IPC listeners ──
  ipcMain.on('tray:muteToggled', (event, muted) => {
    notificationService.setMuted(muted);
  });

  ipcMain.on('tray:openSettings', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tray:openSettings');
    }
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  logger.info('Initializing Dry Chat Windows Application...');

  try {
    localStorageService.init();
    await dbService.init();
    firebaseService.init();
    mediaExpirationService.start();
    syncService.start();
    setupAutoLaunch();
    await createWindow();

    logger.info('Dry Chat startup sequence completed successfully.');
  } catch (err) {
    logger.error('Startup sequence failed:', err);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent app from fully quitting when all windows closed (tray still lives)
app.on('window-all-closed', () => {
  // On Windows, keep running in tray — don't quit
  if (process.platform === 'darwin') {
    app.quit();
  }
  // Windows: stay alive in tray
});

app.on('before-quit', () => {
  isQuitting = true;
  trayService.destroy();
  mediaExpirationService.stop();
  syncService.stop();
  dbService.close();
  logger.info('Dry Chat application exiting cleanly.');
});
