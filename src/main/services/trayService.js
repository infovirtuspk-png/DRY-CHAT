const { Tray, Menu, nativeImage, app, shell } = require('electron');
const path = require('path');
const logger = require('../utils/logger');

class TrayService {
  constructor() {
    this.tray = null;
    this.mainWindow = null;
    this.unreadCount = 0;
    this.iconPath = path.join(__dirname, '..', '..', 'renderer', 'assets', 'icons', 'icon.ico');
    this.blinkInterval = null;
    this.isBlinking = false;
  }

  init(mainWindow) {
    this.mainWindow = mainWindow;
    try {
      const icon = nativeImage.createFromPath(this.iconPath);
      this.tray = new Tray(icon);
      this.tray.setToolTip('Dry Chat — Private Realtime Messaging');
      this._buildContextMenu();
      this._attachEvents();
      logger.info('System tray initialized.');
    } catch (err) {
      logger.error('Tray init failed:', err);
    }
  }

  _buildContextMenu() {
    if (!this.tray) return;

    const unreadLabel = this.unreadCount > 0
      ? `${this.unreadCount} Unread Message${this.unreadCount > 1 ? 's' : ''}`
      : 'No new messages';

    const menu = Menu.buildFromTemplate([
      {
        label: '💬  Dry Chat',
        enabled: false,
        icon: nativeImage.createFromPath(this.iconPath).resize({ width: 16, height: 16 })
      },
      { type: 'separator' },
      {
        label: `🔔  ${unreadLabel}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '📂  Open Dry Chat',
        click: () => this._showWindow()
      },
      {
        label: '🔇  Mute Notifications',
        type: 'checkbox',
        checked: false,
        click: (item) => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('tray:muteToggled', item.checked);
          }
        }
      },
      { type: 'separator' },
      {
        label: '⚙️  Settings',
        click: () => {
          this._showWindow();
          setTimeout(() => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('tray:openSettings');
            }
          }, 400);
        }
      },
      {
        label: '📁  Open Media Folder',
        click: () => {
          const mediaPath = path.join(
            require('os').homedir(),
            'Documents', 'Dry Chat'
          );
          shell.openPath(mediaPath);
        }
      },
      { type: 'separator' },
      {
        label: '🔄  Run at Startup',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            openAsHidden: true,
            name: 'Dry Chat'
          });
          logger.info(`Auto-start ${item.checked ? 'enabled' : 'disabled'}.`);
        }
      },
      { type: 'separator' },
      {
        label: '❌  Quit Dry Chat',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(menu);
  }

  _attachEvents() {
    if (!this.tray) return;

    // Double-click on tray icon to show/hide window
    this.tray.on('double-click', () => {
      this._showWindow();
    });

    // Single click to show window on Windows
    this.tray.on('click', () => {
      if (process.platform === 'win32') {
        this._toggleWindow();
      }
    });
  }

  _showWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
    this.mainWindow.show();
    this.mainWindow.focus();
    this.stopBlink();
  }

  _toggleWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.mainWindow.isVisible() && !this.mainWindow.isMinimized()) {
      this.mainWindow.hide();
    } else {
      this._showWindow();
    }
  }

  setUnreadCount(count) {
    this.unreadCount = count;
    const tooltip = count > 0
      ? `Dry Chat — ${count} unread message${count > 1 ? 's' : ''}`
      : 'Dry Chat — Private Realtime Messaging';
    if (this.tray) {
      this.tray.setToolTip(tooltip);
    }
    this._buildContextMenu();
    if (count > 0) {
      this.startBlink();
    } else {
      this.stopBlink();
    }
  }

  startBlink() {
    if (this.blinkInterval || !this.tray) return;
    this.isBlinking = true;
    const normalIcon = nativeImage.createFromPath(this.iconPath);
    const emptyIcon = nativeImage.createEmpty();
    let toggle = false;

    this.blinkInterval = setInterval(() => {
      if (!this.tray) {
        this.stopBlink();
        return;
      }
      try {
        this.tray.setImage(toggle ? normalIcon : emptyIcon);
        toggle = !toggle;
      } catch (e) {
        this.stopBlink();
      }
    }, 600);
  }

  stopBlink() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    this.isBlinking = false;
    if (this.tray) {
      try {
        const icon = nativeImage.createFromPath(this.iconPath);
        this.tray.setImage(icon);
      } catch (e) {
        // ignore
      }
    }
  }

  showIncomingMessageBalloon(senderName, messagePreview, chatId) {
    if (!this.tray || process.platform !== 'win32') return;
    try {
      this.tray.displayBalloon({
        iconType: 'custom',
        icon: nativeImage.createFromPath(this.iconPath),
        title: `💬 ${senderName}`,
        content: messagePreview || 'New message received',
        noSound: false,
        respectQuietTime: true,
        largeIcon: true
      });

      this.tray.once('balloon-click', () => {
        this._showWindow();
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('notification:clicked', { chatId });
        }
      });
    } catch (err) {
      // Balloon notifications may fail on some Windows configs
      logger.warn('Tray balloon failed:', err.message);
    }
  }

  destroy() {
    this.stopBlink();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    logger.info('TrayService destroyed.');
  }
}

module.exports = new TrayService();
