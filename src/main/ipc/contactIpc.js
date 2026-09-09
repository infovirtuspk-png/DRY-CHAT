const { ipcMain } = require('electron');
const firebaseService = require('../services/firebaseService');
const contactRepo = require('../database/repositories/contactRepo');
const logger = require('../utils/logger');

function registerContactIpc() {
  // Search user by 13-digit ID
  ipcMain.handle('contact:search13DigitId', async (event, { dryChatId }) => {
    return await firebaseService.searchUserBy13DigitId(dryChatId);
  });

  // Get all contacts
  ipcMain.handle('contact:getAll', async (event, { ownerUserId }) => {
    try {
      const contacts = contactRepo.getContacts(ownerUserId);
      return { success: true, contacts };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Add contact
  ipcMain.handle('contact:add', async (event, contactData) => {
    try {
      const contact = contactRepo.addContact(contactData);
      return { success: true, contact };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Toggle favorite
  ipcMain.handle('contact:toggleFavorite', async (event, { ownerUserId, contactUserId, favorite }) => {
    try {
      contactRepo.setFavorite(ownerUserId, contactUserId, favorite);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Block / Unblock
  ipcMain.handle('contact:toggleBlock', async (event, { ownerUserId, contactUserId, blocked, contactDryChatId, displayName }) => {
    try {
      contactRepo.setBlocked(ownerUserId, contactUserId, blocked, contactDryChatId, displayName);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get blocked contacts
  ipcMain.handle('contact:getBlocked', async (event, { ownerUserId }) => {
    try {
      const blocked = contactRepo.getBlockedContacts(ownerUserId);
      return { success: true, blocked };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Remove contact
  ipcMain.handle('contact:remove', async (event, { ownerUserId, contactUserId }) => {
    try {
      contactRepo.removeContact(ownerUserId, contactUserId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerContactIpc;
