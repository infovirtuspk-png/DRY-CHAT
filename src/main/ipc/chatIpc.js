const { ipcMain } = require('electron');
const chatRepo = require('../database/repositories/chatRepo');
const messageRepo = require('../database/repositories/messageRepo');
const logger = require('../utils/logger');

function registerChatIpc() {
  // Get all active chats
  ipcMain.handle('chat:getAll', async (event, options) => {
    try {
      const chats = chatRepo.getAllChats(options || {});
      return { success: true, chats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get archived chats
  ipcMain.handle('chat:getArchived', async () => {
    try {
      const chats = chatRepo.getArchivedChats();
      return { success: true, chats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Create or get direct/group chat
  ipcMain.handle('chat:createOrGet', async (event, chatData) => {
    try {
      const chat = chatRepo.createOrUpdateChat(chatData);
      return { success: true, chat };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Pin / Unpin
  ipcMain.handle('chat:setPinned', async (event, { chatId, pinned }) => {
    try {
      chatRepo.setPinned(chatId, pinned);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Archive / Unarchive
  ipcMain.handle('chat:setArchived', async (event, { chatId, archived }) => {
    try {
      chatRepo.setArchived(chatId, archived);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Mute / Unmute
  ipcMain.handle('chat:setMuted', async (event, { chatId, muted }) => {
    try {
      chatRepo.setMuted(chatId, muted);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Reset unread count
  ipcMain.handle('chat:resetUnread', async (event, { chatId }) => {
    try {
      chatRepo.resetUnread(chatId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Save / Get draft
  ipcMain.handle('chat:saveDraft', async (event, { chatId, draft }) => {
    try {
      chatRepo.saveDraft(chatId, draft);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('chat:getDraft', async (event, { chatId }) => {
    try {
      const draft = chatRepo.getDraft(chatId);
      return { success: true, draft };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Delete chat locally
  ipcMain.handle('chat:delete', async (event, { chatId }) => {
    try {
      chatRepo.deleteChat(chatId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Chat PIN Lock
  ipcMain.handle('chat:setLock', async (event, { chatId, isLocked, pin }) => {
    try {
      const chat = chatRepo.setChatLock(chatId, isLocked, pin);
      return { success: true, chat };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('chat:verifyLock', async (event, { chatId, pin }) => {
    try {
      const valid = chatRepo.verifyChatLock(chatId, pin);
      return { success: true, valid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Disappearing Messages Timer
  ipcMain.handle('chat:setTimer', async (event, { chatId, timerSeconds }) => {
    try {
      const chat = chatRepo.setChatTimer(chatId, timerSeconds);
      return { success: true, chat };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerChatIpc;
