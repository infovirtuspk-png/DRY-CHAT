const db = require('../index');

class AttachmentRepository {
  createAttachment(attData) {
    const {
      attachmentId,
      messageId,
      mediaType,
      mimeType,
      originalName,
      fileSize,
      localPath = null,
      thumbnailPath = null,
      cloudinaryPublicId = null,
      cloudinaryUrl = null,
      uploadedAt = Date.now(),
      expiresAt = Date.now() + 10000,
      downloadedAt = null,
      deletionStatus = 'pending'
    } = attData;

    db.prepare(`
      INSERT INTO attachments (
        attachment_id, message_id, media_type, mime_type, original_name,
        file_size, local_path, thumbnail_path, cloudinary_public_id,
        cloudinary_url, uploaded_at, expires_at, downloaded_at, deletion_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      attachmentId, messageId, mediaType, mimeType, originalName,
      fileSize, localPath, thumbnailPath, cloudinaryPublicId,
      cloudinaryUrl, uploadedAt, expiresAt, downloadedAt, deletionStatus
    ]);

    return this.getAttachmentById(attachmentId);
  }

  getAttachmentById(attachmentId) {
    return db.prepare('SELECT * FROM attachments WHERE attachment_id = ?').get([attachmentId]);
  }

  getAttachmentByMessageId(messageId) {
    return db.prepare('SELECT * FROM attachments WHERE message_id = ?').get([messageId]);
  }

  updateLocalPath(attachmentId, localPath, thumbnailPath = null) {
    db.prepare(`
      UPDATE attachments
      SET local_path = ?, thumbnail_path = COALESCE(?, thumbnail_path), downloaded_at = ?
      WHERE attachment_id = ?
    `).run([localPath, thumbnailPath, Date.now(), attachmentId]);
  }

  updateDeletionStatus(attachmentId, status) {
    db.prepare(`
      UPDATE attachments SET deletion_status = ? WHERE attachment_id = ?
    `).run([status, attachmentId]);
  }

  getPendingDeletions(nowTimestamp = Date.now()) {
    return db.prepare(`
      SELECT * FROM attachments
      WHERE deletion_status IN ('pending', 'failed')
        AND expires_at <= ?
        AND cloudinary_public_id IS NOT NULL
    `).all([nowTimestamp]);
  }

  getMediaGallery(chatId, mediaType = null) {
    let sql = `
      SELECT a.*, m.chat_id, m.created_at as message_time
      FROM attachments a
      JOIN messages m ON a.message_id = m.message_id
      WHERE m.chat_id = ? AND m.deleted = 0 AND m.deleted_for_everyone = 0
    `;
    const params = [chatId];

    if (mediaType) {
      sql += ' AND a.media_type = ?';
      params.push(mediaType);
    }

    sql += ' ORDER BY m.created_at DESC';
    return db.prepare(sql).all(params);
  }
}

module.exports = new AttachmentRepository();
