const cloudinaryService = require('./cloudinaryService');
const attachmentRepo = require('../database/repositories/attachmentRepo');
const logger = require('../utils/logger');

class MediaExpirationService {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
    this.intervalMs = 3000; // Check every 3 seconds for expired assets
  }

  start() {
    if (this.timer) return;
    logger.info('MediaExpirationService started.');
    this.timer = setInterval(() => this.processExpiredMedia(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('MediaExpirationService stopped.');
    }
  }

  /**
   * Schedule media expiration for an attachment
   */
  scheduleExpiration(attachmentId, delaySeconds = 10) {
    logger.media(`Scheduled remote expiration for attachment ${attachmentId} in ${delaySeconds} seconds`);
    setTimeout(async () => {
      await this.expireAttachment(attachmentId);
    }, delaySeconds * 1000);
  }

  /**
   * Expire and delete a single attachment remotely from Cloudinary
   */
  async expireAttachment(attachmentId) {
    try {
      const att = attachmentRepo.getAttachmentById(attachmentId);
      if (!att || !att.cloudinary_public_id || att.deletion_status === 'deleted') {
        return;
      }

      attachmentRepo.updateDeletionStatus(attachmentId, 'processing');
      const deleteResult = await cloudinaryService.deleteMedia(att.cloudinary_public_id, att.media_type);

      if (deleteResult.success) {
        attachmentRepo.updateDeletionStatus(attachmentId, 'deleted');
        logger.media(`Successfully expired remote media for attachment: ${attachmentId} (public_id: ${att.cloudinary_public_id})`);
      } else {
        attachmentRepo.updateDeletionStatus(attachmentId, 'failed');
        logger.warn(`Remote deletion failed for attachment ${attachmentId}, will retry`);
      }
    } catch (err) {
      logger.error(`Error during media expiration for ${attachmentId}:`, err);
      attachmentRepo.updateDeletionStatus(attachmentId, 'failed');
    }
  }

  /**
   * Process all pending or failed deletions that have passed their expiration timestamp
   */
  async processExpiredMedia() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingDeletions = attachmentRepo.getPendingDeletions(Date.now());
      for (const att of pendingDeletions) {
        await this.expireAttachment(att.attachment_id);
      }
    } catch (err) {
      logger.error('Error during batch media expiration processing:', err);
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = new MediaExpirationService();
