const firebaseService = require('./firebaseService');
const logger = require('../utils/logger');

class PresenceService {
  constructor() {
    this.currentUid = null;
    this.heartbeatInterval = null;
    this.presenceCache = new Map();
  }

  start(uid) {
    this.currentUid = uid;
    firebaseService.setPresence(uid, 'online');

    // Heartbeat every 60s
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.currentUid) {
        firebaseService.setPresence(this.currentUid, 'online');
      }
    }, 60000);

    logger.info(`PresenceService started for user: ${uid}`);
  }

  stop() {
    if (this.currentUid) {
      firebaseService.setPresence(this.currentUid, 'offline');
      this.currentUid = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.presenceCache.clear();
    logger.info('PresenceService stopped.');
  }

  subscribeToUserPresence(targetUid, onStatusChange) {
    return firebaseService.listenToPresence(targetUid, (presenceData) => {
      const status = presenceData ? presenceData.status : 'offline';
      const lastSeen = presenceData ? presenceData.lastSeen : null;
      this.presenceCache.set(targetUid, { status, lastSeen });
      onStatusChange({ uid: targetUid, status, lastSeen });
    });
  }

  getCachedPresence(uid) {
    return this.presenceCache.get(uid) || { status: 'offline', lastSeen: null };
  }
}

module.exports = new PresenceService();
