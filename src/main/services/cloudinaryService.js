const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

class CloudinaryService {
  constructor() {
    this.configured = false;
    this.init();
  }

  init() {
    try {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
        secure: true
      });
      this.configured = true;
      logger.info('Cloudinary service initialized securely.');
    } catch (err) {
      logger.error('Failed to configure Cloudinary:', err);
    }
  }

  /**
   * Upload media file temporarily to Cloudinary for transport.
   * @param {string} filePath - Local absolute file path
   * @param {string} mediaType - 'image' or 'video' or 'raw'
   * @param {object} options - Additional upload options
   */
  async uploadTemporaryMedia(filePath, mediaType = 'image', options = {}) {
    if (!this.configured) {
      this.init();
    }

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found for upload: ${filePath}`);
      }

      const resourceType = mediaType === 'video' ? 'video' : (mediaType === 'image' ? 'image' : 'auto');

      logger.media(`Starting Cloudinary temporary upload: ${filePath} (${resourceType})`);

      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: 'dry_chat_ephemeral',
        resource_type: resourceType,
        overwrite: false,
        use_filename: true,
        tags: ['dry_chat_ephemeral', `expire_${Date.now() + (config.cloudinary.expirationSeconds * 1000)}`],
        ...options
      });

      logger.media(`Cloudinary temporary upload succeeded: public_id=${uploadResult.public_id}`);

      return {
        success: true,
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        resourceType: uploadResult.resource_type,
        expiresAt: Date.now() + (config.cloudinary.expirationSeconds * 1000)
      };
    } catch (err) {
      logger.error('Cloudinary upload failed:', err);
      return {
        success: false,
        error: err.message || 'Upload failed'
      };
    }
  }

  /**
   * Delete ephemeral media from Cloudinary.
   * @param {string} publicId - Cloudinary asset public ID
   * @param {string} resourceType - 'image' or 'video'
   */
  async deleteMedia(publicId, resourceType = 'image') {
    if (!this.configured) {
      this.init();
    }

    try {
      logger.media(`Deleting ephemeral Cloudinary asset: ${publicId}`);
      const type = resourceType === 'video' ? 'video' : 'image';
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: type,
        invalidate: true
      });

      logger.media(`Cloudinary deletion response for ${publicId}:`, result);
      return {
        success: result.result === 'ok' || result.result === 'not found',
        result: result.result
      };
    } catch (err) {
      logger.error(`Cloudinary deletion error for ${publicId}:`, err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = new CloudinaryService();
