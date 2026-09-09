const { ipcMain } = require('electron');
const firebaseService = require('../services/firebaseService');
const userRepo = require('../database/repositories/userRepo');
const presenceService = require('../services/presenceService');
const syncService = require('../services/syncService');
const logger = require('../utils/logger');

function registerAuthIpc() {
  // Check active local session
  ipcMain.handle('auth:checkSession', async () => {
    try {
      const session = userRepo.getCurrentSession();
      if (!session) return { authenticated: false };

      const user = userRepo.getUserByUid(session.firebase_uid);
      if (!user) return { authenticated: false };

      presenceService.start(user.firebase_uid);
      syncService.startUserListener(user.firebase_uid);

      return {
        authenticated: true,
        user: {
          uid: user.firebase_uid,
          dryChatId: user.dry_chat_id,
          name: user.name,
          email: user.email,
          username: user.username,
          avatarPath: user.avatar_path,
          about: user.about
        }
      };
    } catch (err) {
      logger.error('Session check error:', err);
      return { authenticated: false, error: err.message };
    }
  });

  // Register user
  ipcMain.handle('auth:register', async (event, params) => {
    try {
      const { name, email, password, username, about, avatarPath } = params;
      if (!name || !email || !password) {
        return { success: false, error: 'Name, email, and password are required.' };
      }

      const res = await firebaseService.registerUser(name, email, password, username, about, avatarPath);
      if (!res.success) return res;

      // Save user to SQLite
      userRepo.createUser({
        firebaseUid: res.user.uid,
        dryChatId: res.user.dryChatId,
        name: res.user.name,
        email: res.user.email,
        username: res.user.username,
        about: res.user.about,
        avatarPath: res.user.avatarPath
      });

      // Save local session
      userRepo.saveSession({
        sessionToken: `sess_${Date.now()}`,
        firebaseUid: res.user.uid,
        dryChatId: res.user.dryChatId,
        deviceName: 'Windows Desktop'
      });

      presenceService.start(res.user.uid);
      syncService.startUserListener(res.user.uid);

      return { success: true, user: res.user };
    } catch (err) {
      logger.error('IPC auth:register error:', err);
      return { success: false, error: err.message };
    }
  });

  // Login user
  ipcMain.handle('auth:login', async (event, params) => {
    try {
      const { email, password } = params;
      if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
      }

      const res = await firebaseService.loginUser(email, password);
      if (!res.success) return res;

      // Ensure user exists in local SQLite
      let user = userRepo.getUserByUid(res.user.uid);
      if (!user) {
        user = userRepo.createUser({
          firebaseUid: res.user.uid,
          dryChatId: res.user.dryChatId,
          name: res.user.name,
          email: res.user.email,
          username: res.user.username || '',
          about: res.user.about || 'Available on Dry Chat',
          avatarPath: res.user.avatarPath || ''
        });
      }

      // Save session
      userRepo.saveSession({
        sessionToken: `sess_${Date.now()}`,
        firebaseUid: res.user.uid,
        dryChatId: res.user.dryChatId,
        deviceName: 'Windows Desktop'
      });

      presenceService.start(res.user.uid);
      syncService.startUserListener(res.user.uid);

      return { success: true, user: res.user };
    } catch (err) {
      logger.error('IPC auth:login error:', err);
      return { success: false, error: err.message };
    }
  });

  // Logout
  ipcMain.handle('auth:logout', async () => {
    try {
      presenceService.stop();
      syncService.stopUserListener();
      userRepo.clearSessions();
      await firebaseService.logoutUser();
      return { success: true };
    } catch (err) {
      logger.error('IPC auth:logout error:', err);
      return { success: false, error: err.message };
    }
  });

  // Forgot password
  ipcMain.handle('auth:forgotPassword', async (event, { email }) => {
    return await firebaseService.sendPasswordReset(email);
  });

  // Update profile
  ipcMain.handle('auth:updateProfile', async (event, { uid, updates }) => {
    try {
      const updated = userRepo.updateProfile(uid, updates);
      if (updated) {
        // Sync with Firebase RTDB
        await firebaseService.adminRestRequest(`users/${uid}/profile`, 'PATCH', {
          name: updated.name,
          username: updated.username,
          about: updated.about,
          avatarPath: updated.avatar_path,
          updatedAt: Date.now()
        });

        if (updated.dry_chat_id) {
          await firebaseService.adminRestRequest(`userIdMap/${updated.dry_chat_id}`, 'PATCH', {
            name: updated.name,
            username: updated.username,
            about: updated.about,
            avatarPath: updated.avatar_path
          });
        }
      }
      return {
        success: true,
        user: {
          uid: updated.firebase_uid,
          dryChatId: updated.dry_chat_id,
          name: updated.name,
          email: updated.email,
          username: updated.username,
          avatarPath: updated.avatar_path,
          about: updated.about,
          createdAt: updated.created_at
        }
      };
    } catch (err) {
      logger.error('Error updating profile:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerAuthIpc;
