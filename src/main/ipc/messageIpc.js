const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const syncService = require('../services/syncService');
const firebaseService = require('../services/firebaseService');
const messageRepo = require('../database/repositories/messageRepo');
const chatRepo = require('../database/repositories/chatRepo');
const logger = require('../utils/logger');

function registerMessageIpc() {
  // Send message
  ipcMain.handle('message:send', async (event, params) => {
    try {
      const messageId = params.messageId || uuidv4();
      const messageData = {
        messageId,
        chatId: params.chatId,
        senderId: params.senderId,
        senderDryChatId: params.senderDryChatId || '',
        senderName: params.senderName || '',
        messageType: params.messageType || 'text',
        content: params.content,
        replyToMessageId: params.replyToMessageId || null,
        replyPreview: params.replyPreview || null,
        forwardedFromMessageId: params.forwardedFromMessageId || null,
        isForwarded: params.isForwarded || 0,
        attachmentId: params.attachmentId || null,
        timerSeconds: params.timerSeconds || 0,
        createdAt: Date.now()
      };

      const result = await syncService.sendMessage(messageData);
      return { success: true, message: result };
    } catch (err) {
      logger.error('IPC message:send error:', err);
      return { success: false, error: err.message };
    }
  });

  // Get messages for a chat (paginated)
  ipcMain.handle('message:getByChat', async (event, { chatId, limit = 50, beforeTimestamp = null }) => {
    try {
      const messages = messageRepo.getMessagesByChatId(chatId, limit, beforeTimestamp);
      return { success: true, messages };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Add / Remove reaction
  ipcMain.handle('message:react', async (event, { messageId, chatId, userId, emoji }) => {
    try {
      const res = messageRepo.addReaction(messageId, chatId, userId, emoji);
      await firebaseService.syncReaction(chatId, messageId, userId, emoji, res.action);
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Edit message
  ipcMain.handle('message:edit', async (event, { messageId, chatId, newContent }) => {
    try {
      const edited = messageRepo.editMessage(messageId, newContent);
      return { success: true, message: edited };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Delete message
  ipcMain.handle('message:delete', async (event, { messageId, chatId, forEveryone }) => {
    try {
      if (forEveryone) {
        messageRepo.deleteMessageForEveryone(messageId);
        // Sync delete for everyone to Firebase
        if (chatId) {
          await firebaseService.sendRealtimeMessage(chatId, {
            messageId,
            content: 'This message was deleted',
            deletedForEveryone: true,
            updatedAt: Date.now()
          });
        }
      } else {
        messageRepo.deleteMessageForMe(messageId);
      }
      if (chatId) {
        chatRepo.refreshLastMessage(chatId);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Star / Unstar
  ipcMain.handle('message:toggleStar', async (event, { messageId, isStarred }) => {
    try {
      messageRepo.setStarred(messageId, isStarred);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get Starred messages
  ipcMain.handle('message:getStarred', async () => {
    try {
      const messages = messageRepo.getStarredMessages();
      return { success: true, messages };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Search messages
  ipcMain.handle('message:search', async (event, { query, chatId }) => {
    try {
      const results = messageRepo.searchMessages(query, chatId);
      return { success: true, results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Set Typing indicator
  ipcMain.handle('message:setTyping', async (event, { chatId, uid, isTyping }) => {
    try {
      await firebaseService.setTyping(chatId, uid, isTyping);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerMessageIpc;
