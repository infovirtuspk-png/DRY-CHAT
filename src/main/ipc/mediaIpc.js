const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const localStorageService = require('../services/localStorageService');
const cloudinaryService = require('../services/cloudinaryService');
const mediaExpirationService = require('../services/mediaExpirationService');
const attachmentRepo = require('../database/repositories/attachmentRepo');
const { generateSafeFilename, validateMimeType } = require('../utils/security');
const logger = require('../utils/logger');

function registerMediaIpc() {
  // Pick local media file
  ipcMain.handle('media:pickFile', async (event, { mediaType }) => {
    try {
      const filters = mediaType === 'video'
        ? [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'mkv'] }]
        : [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }];

      const result = await dialog.showOpenDialog({
        title: `Select ${mediaType === 'video' ? 'Video' : 'Image'}`,
        properties: ['openFile'],
        filters
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      return {
        canceled: false,
        filePath,
        fileName: path.basename(filePath),
        fileSize: stats.size,
        extension: ext
      };
    } catch (err) {
      logger.error('Error picking media file:', err);
      return { canceled: true, error: err.message };
    }
  });

  // Upload ephemeral media
  ipcMain.handle('media:uploadEphemeral', async (event, params) => {
    try {
      const { sourceFilePath, mediaType, messageId } = params;
      const attachmentId = uuidv4();
      const safeFilename = generateSafeFilename(path.basename(sourceFilePath), mediaType);

      // 1. Copy permanently to user's Windows Documents/Dry Chat/Images or Videos
      const localSavedPath = localStorageService.copyToLocalStorage(sourceFilePath, safeFilename, mediaType);
      const stats = fs.statSync(localSavedPath);

      // 2. Upload to Cloudinary for ephemeral 10s transport
      const uploadRes = await cloudinaryService.uploadTemporaryMedia(localSavedPath, mediaType);
      if (!uploadRes.success) {
        return { success: false, error: uploadRes.error };
      }

      // 3. Create attachment record in SQLite
      const attachment = attachmentRepo.createAttachment({
        attachmentId,
        messageId,
        mediaType,
        mimeType: uploadRes.format ? `${mediaType}/${uploadRes.format}` : `${mediaType}/octet-stream`,
        originalName: path.basename(sourceFilePath),
        fileSize: stats.size,
        localPath: localSavedPath,
        thumbnailPath: null,
        cloudinaryPublicId: uploadRes.publicId,
        cloudinaryUrl: uploadRes.url,
        uploadedAt: Date.now(),
        expiresAt: uploadRes.expiresAt,
        downloadedAt: Date.now(),
        deletionStatus: 'pending'
      });

      // 4. Schedule server-side Cloudinary expiration (10 seconds)
      mediaExpirationService.scheduleExpiration(attachmentId, 10);

      return {
        success: true,
        attachment: {
          attachmentId,
          localPath: localSavedPath,
          cloudinaryUrl: uploadRes.url,
          cloudinaryPublicId: uploadRes.publicId,
          mediaType,
          fileSize: stats.size,
          expiresAt: uploadRes.expiresAt
        }
      };
    } catch (err) {
      logger.error('Error in media:uploadEphemeral:', err);
      return { success: false, error: err.message };
    }
  });

  // Download & save ephemeral media locally on receiver side
  ipcMain.handle('media:downloadAndSave', async (event, params) => {
    try {
      const { cloudinaryUrl, mediaType, originalName, attachmentId, messageId } = params;
      const safeFilename = generateSafeFilename(originalName || `received_${Date.now()}`, mediaType);
      const targetDir = localStorageService.getMediaDirectory(mediaType);
      const targetPath = path.join(targetDir, safeFilename);

      logger.media(`Downloading ephemeral media to: ${targetPath}`);

      const file = fs.createWriteStream(targetPath);
      const protocol = cloudinaryUrl.startsWith('https') ? https : http;

      await new Promise((resolve, reject) => {
        protocol.get(cloudinaryUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download media: HTTP ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        }).on('error', (err) => {
          fs.unlink(targetPath, () => {});
          reject(err);
        });
      });

      // Update SQLite attachment record
      attachmentRepo.updateLocalPath(attachmentId, targetPath);

      return {
        success: true,
        localPath: targetPath
      };
    } catch (err) {
      logger.error('Error downloading ephemeral media:', err);
      return { success: false, error: err.message };
    }
  });

  // Get chat media gallery
  ipcMain.handle('media:getGallery', async (event, { chatId, mediaType }) => {
    try {
      const media = attachmentRepo.getMediaGallery(chatId, mediaType);
      return { success: true, media };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Open file in Windows Explorer
  ipcMain.handle('media:showInFolder', async (event, { filePath }) => {
    try {
      if (fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return { success: true };
      }
      return { success: false, error: 'File does not exist' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerMediaIpc;
