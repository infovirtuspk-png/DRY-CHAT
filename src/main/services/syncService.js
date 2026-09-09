const firebaseService = require('./firebaseService');
const syncRepo = require('../database/repositories/syncRepo');
const messageRepo = require('../database/repositories/messageRepo');
const chatRepo = require('../database/repositories/chatRepo');
const contactRepo = require('../database/repositories/contactRepo');
const notificationService = require('./notificationService');
const config = require('../config');
const logger = require('../utils/logger');

class SyncService {
  constructor() {
    this.intervalId = null;
    this.isProcessingQueue = false;
    this.ipcBroadcast = null;
    this.currentUserUid = null;
  }

  setBroadcastHandler(fn) {
    this.ipcBroadcast = fn;
  }

  start() {
    if (this.intervalId) return;
    logger.info('SyncService started.');
    this.intervalId = setInterval(() => {
      this.processSyncQueue();
      // Also purge expired disappearing messages
      const expired = messageRepo.purgeExpiredMessages();
      if (expired && expired.length > 0 && this.ipcBroadcast) {
        this.ipcBroadcast('messages:expired', expired);
      }
    }, config.sync.syncIntervalMs);
  }

  startUserListener(userUid) {
    this.currentUserUid = userUid;
    logger.info(`Starting user inbox listener for: ${userUid}`);
    firebaseService.listenToUserInbox(userUid, async (rawMsg) => {
      await this.ingestIncomingMessage(rawMsg.chatId, rawMsg, userUid);
    });
  }

  stopUserListener() {
    this.currentUserUid = null;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('SyncService stopped.');
    }
  }

  /**
   * Send message with optimistic local insert and sync queue fallback
   */
  async sendMessage(messageData) {
    const { messageId, chatId, senderId, content } = messageData;

    // 1. Insert into local SQLite immediately (Sender's permanent storage)
    const localMsg = messageRepo.createMessage({
      ...messageData,
      syncStatus: 'sent'
    });

    // Update chat last message
    chatRepo.updateLastMessage(chatId, messageId, content, Date.now());

    // Determine recipient UID (if direct chat e.g. uid1_uid2)
    let recipientUid = null;
    if (chatId && chatId.includes('_')) {
      const parts = chatId.split('_');
      recipientUid = parts.find(uid => uid !== senderId);
    }

    const payload = {
      messageId,
      chatId,
      senderId: messageData.senderId,
      senderDryChatId: messageData.senderDryChatId || '',
      senderName: messageData.senderName || '',
      messageType: messageData.messageType || 'text',
      content,
      replyToMessageId: messageData.replyToMessageId || null,
      replyPreview: messageData.replyPreview || null,
      forwardedFromMessageId: messageData.forwardedFromMessageId || null,
      isForwarded: messageData.isForwarded || 0,
      attachmentId: messageData.attachmentId || null,
      createdAt: messageData.createdAt || Date.now(),
      syncStatus: 'sent'
    };

    // 2. Try immediate Firebase ephemeral relay if online
    if (firebaseService.isOnline) {
      try {
        if (recipientUid) {
          await firebaseService.sendInboxMessage(recipientUid, payload);
        }
        await firebaseService.sendRealtimeMessage(chatId, payload);

        messageRepo.updateSyncStatus(messageId, 'sent');
        logger.sync(`Message ${messageId} routed to Firebase relay.`);

        return { ...localMsg, sync_status: 'sent' };
      } catch (err) {
        logger.warn(`Immediate Firebase relay failed for message ${messageId}, queueing:`, err);
      }
    }

    // 3. Fallback: Enqueue for background sync
    syncRepo.enqueue('send_message', messageId, { ...payload, recipientUid });
    messageRepo.updateSyncStatus(messageId, 'pending');

    return { ...localMsg, sync_status: 'pending' };
  }

  /**
   * Process pending items in sync queue with exponential backoff
   */
  async processSyncQueue() {
    if (this.isProcessingQueue || !firebaseService.isOnline) return;
    this.isProcessingQueue = true;

    try {
      const pendingItems = syncRepo.getPendingItems();
      for (const item of pendingItems) {
        syncRepo.markProcessing(item.queue_id);
        const payload = JSON.parse(item.payload);

        try {
          if (item.operation_type === 'send_message') {
            if (payload.recipientUid) {
              await firebaseService.sendInboxMessage(payload.recipientUid, payload);
            }
            await firebaseService.sendRealtimeMessage(payload.chatId, payload);
            messageRepo.updateSyncStatus(payload.messageId, 'sent');
          }

          syncRepo.markCompleted(item.queue_id);
          logger.sync(`Processed sync queue item: ${item.queue_id}`);

          if (this.ipcBroadcast) {
            this.ipcBroadcast('sync:itemCompleted', {
              operationType: item.operation_type,
              entityId: item.entity_id
            });
          }
        } catch (err) {
          const backoff = Math.min(
            config.sync.initialBackoffMs * Math.pow(2, item.retry_count),
            config.sync.maxBackoffMs
          );
          syncRepo.markFailed(item.queue_id, err.message, backoff);
          logger.warn(`Failed sync queue item ${item.queue_id}, retrying in ${backoff}ms:`, err);
        }
      }
    } catch (err) {
      logger.error('Error processing sync queue:', err);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Ingest incoming realtime message from Firebase into local SQLite, then delete from Firebase
   */
  async ingestIncomingMessage(chatId, rawMsg, currentUserId) {
    if (!rawMsg || !rawMsg.messageId) return null;

    // Check if sender is blocked by receiver
    if (currentUserId && rawMsg.senderId && rawMsg.senderId !== currentUserId) {
      const isBlocked = contactRepo.isBlocked(currentUserId, rawMsg.senderId);
      if (isBlocked) {
        logger.info(`Message ${rawMsg.messageId} from blocked user ${rawMsg.senderId} was dropped.`);
        // Permanently delete from Firebase immediately
        if (currentUserId) {
          await firebaseService.deleteInboxMessage(currentUserId, rawMsg.messageId);
        }
        if (chatId) {
          await firebaseService.deleteRealtimeMessage(chatId, rawMsg.messageId);
        }
        return null;
      }
    }

    const existing = messageRepo.getMessageById(rawMsg.messageId);
    if (existing) {
      if (rawMsg.syncStatus && rawMsg.syncStatus !== existing.sync_status) {
        messageRepo.updateSyncStatus(rawMsg.messageId, rawMsg.syncStatus, rawMsg.deliveredAt, rawMsg.readAt);
      }
      return existing;
    }

    // 1. Save newly received message into Receiver's local SQLite DB
    const msg = messageRepo.createMessage({
      messageId: rawMsg.messageId,
      chatId,
      senderId: rawMsg.senderId,
      senderDryChatId: rawMsg.senderDryChatId || '',
      senderName: rawMsg.senderName || '',
      messageType: rawMsg.messageType || 'text',
      content: rawMsg.content,
      replyToMessageId: rawMsg.replyToMessageId || null,
      replyPreview: rawMsg.replyPreview || null,
      forwardedFromMessageId: rawMsg.forwardedFromMessageId || null,
      isForwarded: rawMsg.isForwarded || 0,
      attachmentId: rawMsg.attachmentId || null,
      createdAt: rawMsg.createdAt || Date.now(),
      syncStatus: rawMsg.senderId === currentUserId ? 'sent' : 'delivered',
      timerSeconds: rawMsg.timerSeconds || 0,
      expiresAt: rawMsg.expiresAt || null
    });

    // 2. Ensure chat exists and update last message in Receiver's local DB
    chatRepo.createOrUpdateChat({
      chatId,
      chatType: 'direct',
      title: rawMsg.senderName || 'Direct Message',
      lastMessageId: rawMsg.messageId,
      lastMessageContent: rawMsg.content,
      lastMessageTime: rawMsg.createdAt || Date.now()
    });

    if (rawMsg.senderId !== currentUserId) {
      chatRepo.incrementUnread(chatId);
      
      // Desktop notification
      notificationService.showMessageNotification(
        rawMsg.senderName || 'New Message',
        rawMsg.content,
        chatId
      );
    }

    // 3. Notify renderer UI via IPC
    if (this.ipcBroadcast) {
      this.ipcBroadcast('incoming:message', {
        chatId,
        messageId: rawMsg.messageId,
        senderId: rawMsg.senderId,
        content: rawMsg.content
      });
    }

    // 4. Immediately delete from Firebase to guarantee zero permanent message storage on cloud
    if (currentUserId) {
      await firebaseService.deleteInboxMessage(currentUserId, rawMsg.messageId);
    }
    if (chatId) {
      await firebaseService.deleteRealtimeMessage(chatId, rawMsg.messageId);
    }

    logger.info(`Message ${rawMsg.messageId} saved locally to SQLite and permanently removed from Firebase.`);
    return msg;
  }
}

module.exports = new SyncService();
