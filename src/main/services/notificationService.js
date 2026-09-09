const { Notification } = require('electron');
const path = require('path');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.mainWindow = null;
    this.trayService = null;
    this.iconPath = path.join(__dirname, '..', '..', 'renderer', 'assets', 'icons', 'icon.ico');
    this.isMuted = false;
    this.totalUnread = 0;
    this.notifQueue = [];
    this.isProcessingQueue = false;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  setTrayService(tray) {
    this.trayService = tray;
  }

  setMuted(muted) {
    this.isMuted = muted;
    logger.info(`Notifications ${muted ? 'muted' : 'unmuted'}.`);
  }

  showMessageNotification(senderName, body, chatId) {
    if (this.isMuted) return;

    // Increment unread
    const isWindowFocused = this.mainWindow &&
      !this.mainWindow.isDestroyed() &&
      this.mainWindow.isFocused() &&
      this.mainWindow.isVisible();

    if (!isWindowFocused) {
      this.totalUnread++;
      if (this.trayService) {
        this.trayService.setUnreadCount(this.totalUnread);
        this.trayService.showIncomingMessageBalloon(senderName, body, chatId);
      }
    }

    this._showDesktopNotification(senderName, body, chatId);
  }

  _showDesktopNotification(title, body, chatId) {
    try {
      if (!Notification.isSupported()) return;

      const notif = new Notification({
        title: `💬 ${title || 'Dry Chat'}`,
        body: body || 'New message received',
        icon: this.iconPath,
        silent: false,
        timeoutType: 'default',
        urgency: 'normal',
        toastXml: this._buildToastXml(title, body)
      });

      notif.on('click', () => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.show();
          this.mainWindow.focus();
          if (chatId) {
            this.mainWindow.webContents.send('notification:clicked', { chatId });
          }
        }
        this.clearUnread();
      });

      notif.on('show', () => {
        logger.info(`Notification shown: ${title}`);
      });

      notif.show();
    } catch (err) {
      logger.warn('Desktop notification failed:', err.message);
    }
  }

  _buildToastXml(title, body) {
    // Rich Windows 10/11 Toast XML
    return `<toast launch="action=openChat" scenario="reminder">
      <visual>
        <binding template="ToastGeneric">
          <text>${this._escapeXml(title || 'Dry Chat')}</text>
          <text>${this._escapeXml(body || 'New message')}</text>
          <image placement="appLogoOverride" hint-crop="circle" src="${this.iconPath}"/>
        </binding>
      </visual>
      <actions>
        <action content="Open Chat" arguments="action=openChat"/>
        <action content="Dismiss" arguments="action=dismiss"/>
      </actions>
    </toast>`;
  }

  _escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  clearUnread() {
    this.totalUnread = 0;
    if (this.trayService) {
      this.trayService.setUnreadCount(0);
    }
  }

  showSystemNotification(title, body) {
    this._showDesktopNotification(title, body, null);
  }

  // Legacy alias kept for backward compat
  showNotification(title, body, chatId) {
    this.showMessageNotification(title, body, chatId);
  }
}

module.exports = new NotificationService();
