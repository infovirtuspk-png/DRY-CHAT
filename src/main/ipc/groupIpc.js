const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const groupRepo = require('../database/repositories/groupRepo');
const chatRepo = require('../database/repositories/chatRepo');
const logger = require('../utils/logger');

function registerGroupIpc() {
  // Create group
  ipcMain.handle('group:create', async (event, params) => {
    try {
      const { name, description, avatarPath, ownerId, members = [] } = params;
      const groupId = `grp_${uuidv4().substring(0, 12)}`;

      // 1. Create group record
      const group = groupRepo.createGroup({
        groupId,
        name,
        description,
        avatarPath,
        ownerId
      });

      // 2. Create associated chat record
      chatRepo.createOrUpdateChat({
        chatId: groupId,
        chatType: 'group',
        title: name,
        avatar: avatarPath
      });

      // 3. Add initial members
      chatRepo.addMember(groupId, ownerId, '', 'owner');
      for (const member of members) {
        groupRepo.addMember(groupId, member.userId, member.dryChatId || '', 'member');
        chatRepo.addMember(groupId, member.userId, member.dryChatId || '', 'member');
      }

      return { success: true, group: groupRepo.getGroupById(groupId) };
    } catch (err) {
      logger.error('Error creating group:', err);
      return { success: false, error: err.message };
    }
  });

  // Get group details
  ipcMain.handle('group:getDetails', async (event, { groupId }) => {
    try {
      const group = groupRepo.getGroupById(groupId);
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Add member
  ipcMain.handle('group:addMember', async (event, { groupId, userId, dryChatId, role }) => {
    try {
      groupRepo.addMember(groupId, userId, dryChatId, role || 'member');
      chatRepo.addMember(groupId, userId, dryChatId, role || 'member');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Remove member
  ipcMain.handle('group:removeMember', async (event, { groupId, userId }) => {
    try {
      groupRepo.removeMember(groupId, userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Update permissions
  ipcMain.handle('group:updatePermissions', async (event, { groupId, permissions }) => {
    try {
      const group = groupRepo.updateGroup(groupId, permissions);
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerGroupIpc;
