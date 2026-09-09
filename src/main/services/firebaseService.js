const { initializeApp } = require('firebase/app');
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} = require('firebase/auth');
const {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  onDisconnect,
  serverTimestamp
} = require('firebase/database');
const https = require('https');

const config = require('../config');
const logger = require('../utils/logger');
const { generate13DigitIdCandidate, isValid13DigitId } = require('../utils/idGenerator');

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.rtdb = null;
    this.currentUser = null;
    this.activeListeners = new Map();
    this.isOnline = false;
  }

  init() {
    try {
      this.app = initializeApp(config.firebase);
      this.auth = getAuth(this.app);
      this.rtdb = getDatabase(this.app);
      logger.info('Firebase service initialized successfully.');

      // Setup connection state listener
      const connectedRef = ref(this.rtdb, '.info/connected');
      onValue(connectedRef, (snap) => {
        this.isOnline = snap.val() === true;
        logger.info(`Firebase connection state changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      });

      return true;
    } catch (err) {
      logger.error('Failed to initialize Firebase:', err);
      throw err;
    }
  }

  // Admin REST helper for guaranteed server-side backend operations
  async adminRestRequest(pathName, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      try {
        const cleanPath = pathName.startsWith('/') ? pathName.substring(1) : pathName;
        const urlStr = `${config.firebase.databaseURL}/${cleanPath}.json?auth=${config.firebase.databaseSecret}`;
        const parsed = new URL(urlStr);

        const payload = data ? JSON.stringify(data) : null;
        const req = https.request({
          hostname: parsed.hostname,
          path: `${parsed.pathname}${parsed.search}`,
          method,
          headers: payload ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          } : {}
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsedBody = body ? JSON.parse(body) : null;
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, data: parsedBody });
              } else {
                resolve({ success: false, error: parsedBody?.error || `HTTP ${res.statusCode}` });
              }
            } catch (e) {
              resolve({ success: false, error: e.message });
            }
          });
        });

        req.on('error', (e) => resolve({ success: false, error: e.message }));
        if (payload) req.write(payload);
        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  // Authentication
  async registerUser(name, email, password, username = '', about = 'Available on Dry Chat', avatarPath = '') {
    try {
      logger.info(`Registering new user with email: ${email}`);
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update auth profile display name
      await updateProfile(user, { displayName: name });

      // Generate unique 13-digit ID with collision check
      let dryChatId = null;
      for (let i = 0; i < 10; i++) {
        const candidate = generate13DigitIdCandidate();
        const checkRes = await this.adminRestRequest(`userIdMap/${candidate}`, 'GET');
        if (checkRes.success && !checkRes.data) {
          dryChatId = candidate;
          break;
        }
      }

      if (!dryChatId) {
        dryChatId = generate13DigitIdCandidate();
      }

      const now = Date.now();
      const profileData = {
        uid: user.uid,
        dryChatId,
        name,
        email,
        username,
        about,
        avatarPath,
        createdAt: now,
        updatedAt: now
      };

      // Save public lookup map and private profile securely
      await this.adminRestRequest(`userIdMap/${dryChatId}`, 'PUT', {
        uid: user.uid,
        dryChatId,
        name,
        username,
        about,
        avatarPath
      });

      await this.adminRestRequest(`users/${user.uid}/profile`, 'PUT', profileData);

      // Save default privacy settings
      await this.adminRestRequest(`users/${user.uid}/privacy`, 'PUT', {
        lastSeen: 'everyone',
        onlineStatus: 'everyone',
        profilePhoto: 'everyone',
        about: 'everyone',
        readReceipts: true,
        typingIndicator: true,
        unknownMessages: 'everyone'
      });

      this.currentUser = user;
      logger.info(`User registered successfully: ${user.uid} with ID: ${dryChatId}`);

      return {
        success: true,
        user: profileData
      };
    } catch (err) {
      logger.error('Registration failed:', err);
      return {
        success: false,
        error: err.message || 'Registration failed'
      };
    }
  }

  async loginUser(email, password) {
    try {
      logger.info(`Logging in user: ${email}`);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      this.currentUser = user;

      // Fetch user profile from RTDB
      const profileRes = await this.adminRestRequest(`users/${user.uid}/profile`, 'GET');
      let profileData = null;

      if (profileRes.success && profileRes.data) {
        profileData = profileRes.data;
      } else {
        const candidateId = generate13DigitIdCandidate();
        profileData = {
          uid: user.uid,
          dryChatId: candidateId,
          name: user.displayName || email.split('@')[0],
          email: user.email,
          about: 'Available on Dry Chat',
          avatarPath: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await this.adminRestRequest(`userIdMap/${candidateId}`, 'PUT', {
          uid: user.uid,
          dryChatId: candidateId,
          name: profileData.name,
          about: profileData.about
        });
        await this.adminRestRequest(`users/${user.uid}/profile`, 'PUT', profileData);
      }

      logger.info(`Login successful for user: ${user.uid}`);
      return {
        success: true,
        user: profileData
      };
    } catch (err) {
      logger.error('Login failed:', err);
      return {
        success: false,
        error: err.message || 'Login failed'
      };
    }
  }

  async logoutUser() {
    try {
      if (this.currentUser) {
        await this.setPresence(this.currentUser.uid, 'offline');
      }
      this.cleanupAllListeners();
      await signOut(this.auth);
      this.currentUser = null;
      logger.info('User logged out successfully.');
      return { success: true };
    } catch (err) {
      logger.error('Logout failed:', err);
      return { success: false, error: err.message };
    }
  }

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      logger.info(`Password reset email sent to: ${email}`);
      return { success: true };
    } catch (err) {
      logger.error('Password reset email failed:', err);
      return { success: false, error: err.message };
    }
  }

  // 13-Digit ID User Search (Anti-enumeration, exact match only)
  async searchUserBy13DigitId(dryChatId) {
    try {
      if (!isValid13DigitId(dryChatId)) {
        return { success: false, error: 'User ID must be exactly 13 digits.' };
      }

      const mapRes = await this.adminRestRequest(`userIdMap/${dryChatId}`, 'GET');
      if (!mapRes.success || !mapRes.data) {
        return { success: false, error: 'No user found with this 13-digit ID.' };
      }

      const userData = mapRes.data;
      return {
        success: true,
        user: {
          uid: userData.uid,
          dryChatId: userData.dryChatId,
          name: userData.name,
          username: userData.username || '',
          about: userData.about || 'Available on Dry Chat',
          avatarPath: userData.avatarPath || ''
        }
      };
    } catch (err) {
      logger.error(`Search error for ID ${dryChatId}:`, err);
      return { success: false, error: err.message };
    }
  }

  // Presence Management
  async setPresence(uid, status = 'online') {
    if (!this.rtdb || !uid) return;
    try {
      const userPresenceRef = ref(this.rtdb, `presence/${uid}`);
      if (status === 'online') {
        const disconnectRef = onDisconnect(userPresenceRef);
        await disconnectRef.set({
          status: 'offline',
          lastSeen: serverTimestamp()
        });
        await set(userPresenceRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        });
      } else {
        await set(userPresenceRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      }
    } catch (err) {
      logger.error('Presence error:', err);
    }
  }

  listenToPresence(targetUid, callback) {
    if (!this.rtdb || !targetUid) return () => {};
    const presenceRef = ref(this.rtdb, `presence/${targetUid}`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      callback(snapshot.val());
    });
    this.activeListeners.set(`presence_${targetUid}`, { ref: presenceRef, unsubscribe });
    return unsubscribe;
  }

  // Typing Indicators
  async setTyping(chatId, uid, isTyping) {
    if (!this.rtdb || !chatId || !uid) return;
    try {
      const typingRef = ref(this.rtdb, `typing/${chatId}/${uid}`);
      if (isTyping) {
        await set(typingRef, { timestamp: Date.now() });
        const disconnectRef = onDisconnect(typingRef);
        disconnectRef.remove();
      } else {
        await remove(typingRef);
      }
    } catch (err) {
      // ignore typing sync error
    }
  }

  listenToTyping(chatId, currentUid, callback) {
    if (!this.rtdb || !chatId) return () => {};
    const typingRef = ref(this.rtdb, `typing/${chatId}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const typingUsers = Object.keys(data).filter(uid => uid !== currentUid);
      callback(typingUsers);
    });
    this.activeListeners.set(`typing_${chatId}`, { ref: typingRef, unsubscribe });
    return unsubscribe;
  }

  // Ephemeral Realtime Message Relay
  async sendRealtimeMessage(chatId, messageData) {
    if (!this.rtdb || !chatId) {
      throw new Error('Realtime Database not initialized or missing chatId.');
    }
    const messageRef = ref(this.rtdb, `messages/${chatId}/${messageData.messageId}`);
    await set(messageRef, messageData);
    return messageData;
  }

  async sendInboxMessage(recipientUid, messageData) {
    if (!this.rtdb || !recipientUid) return;
    try {
      const inboxRef = ref(this.rtdb, `inboxes/${recipientUid}/${messageData.messageId}`);
      await set(inboxRef, messageData);
      logger.info(`Message ${messageData.messageId} routed to recipient inbox: ${recipientUid}`);
    } catch (err) {
      // Fallback via admin REST request if client write fails
      await this.adminRestRequest(`inboxes/${recipientUid}/${messageData.messageId}`, 'PUT', messageData);
    }
  }

  async deleteInboxMessage(recipientUid, messageId) {
    if (!this.rtdb || !recipientUid || !messageId) return;
    try {
      const inboxRef = ref(this.rtdb, `inboxes/${recipientUid}/${messageId}`);
      await remove(inboxRef);
      logger.info(`Purged delivered message ${messageId} from recipient inbox: ${recipientUid}`);
    } catch (err) {
      await this.adminRestRequest(`inboxes/${recipientUid}/${messageId}`, 'DELETE');
    }
  }

  async deleteRealtimeMessage(chatId, messageId) {
    if (!this.rtdb || !chatId || !messageId) return;
    try {
      const msgRef = ref(this.rtdb, `messages/${chatId}/${messageId}`);
      await remove(msgRef);
      logger.info(`Purged delivered message ${messageId} from chat relay: ${chatId}`);
    } catch (err) {
      await this.adminRestRequest(`messages/${chatId}/${messageId}`, 'DELETE');
    }
  }

  listenToUserInbox(userUid, onMessageReceived) {
    if (!this.rtdb || !userUid) return () => {};
    const inboxRef = ref(this.rtdb, `inboxes/${userUid}`);
    const unsubscribe = onValue(inboxRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      for (const [messageId, rawMsg] of Object.entries(data)) {
        if (rawMsg && typeof rawMsg === 'object') {
          await onMessageReceived({ ...rawMsg, messageId });
          // Automatically remove from Firebase after ingestion
          await this.deleteInboxMessage(userUid, messageId);
          if (rawMsg.chatId) {
            await this.deleteRealtimeMessage(rawMsg.chatId, messageId);
          }
        }
      }
    });

    this.activeListeners.set(`inbox_${userUid}`, { ref: inboxRef, unsubscribe });
    return unsubscribe;
  }

  listenToChatMessages(chatId, currentUserId, callback) {
    if (!this.rtdb || !chatId) return () => {};
    const messagesRef = ref(this.rtdb, `messages/${chatId}`);
    const unsubscribe = onValue(messagesRef, async (snapshot) => {
      const data = snapshot.val();
      if (callback) callback(data);
      if (data && currentUserId) {
        for (const [messageId, rawMsg] of Object.entries(data)) {
          if (rawMsg && rawMsg.senderId !== currentUserId) {
            // Receiver immediately purges message from Firebase
            await this.deleteRealtimeMessage(chatId, messageId);
          }
        }
      }
    });
    this.activeListeners.set(`messages_${chatId}`, { ref: messagesRef, unsubscribe });
    return unsubscribe;
  }

  // Read Receipts & Delivery State
  async markMessageDelivered(chatId, messageId, recipientUid) {
    if (!this.rtdb) return;
    try {
      const msgRef = ref(this.rtdb, `messages/${chatId}/${messageId}`);
      await update(msgRef, {
        deliveredAt: Date.now(),
        syncStatus: 'delivered'
      });
    } catch (err) {
      // ignore
    }
  }

  async markMessageRead(chatId, messageId, readerUid) {
    if (!this.rtdb) return;
    try {
      const msgRef = ref(this.rtdb, `messages/${chatId}/${messageId}`);
      await update(msgRef, {
        readAt: Date.now(),
        syncStatus: 'read'
      });
    } catch (err) {
      // ignore
    }
  }

  // Reactions
  async syncReaction(chatId, messageId, uid, emoji, action) {
    if (!this.rtdb) return;
    try {
      const reactionRef = ref(this.rtdb, `messages/${chatId}/${messageId}/reactions/${uid}_${emoji}`);
      if (action === 'added') {
        await set(reactionRef, { emoji, uid, createdAt: Date.now() });
      } else {
        await remove(reactionRef);
      }
    } catch (err) {
      // ignore
    }
  }

  cleanupAllListeners() {
    for (const [key, listener] of this.activeListeners.entries()) {
      try {
        if (listener.unsubscribe) listener.unsubscribe();
        if (listener.ref) off(listener.ref);
      } catch (err) {
        // ignore
      }
    }
    this.activeListeners.clear();
    logger.info('Cleaned up all Firebase Realtime listeners.');
  }
}

module.exports = new FirebaseService();
