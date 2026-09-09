const db = require('../index');

class MessageRepository {
  createMessage(msgData) {
    const {
      messageId,
      chatId,
      senderId,
      senderDryChatId = '',
      senderName = '',
      messageType = 'text',
      content,
      replyToMessageId = null,
      replyPreview = null,
      forwardedFromMessageId = null,
      isForwarded = 0,
      attachmentId = null,
      createdAt = Date.now(),
      syncStatus = 'pending',
      timerSeconds = 0,
      expiresAt = null
    } = msgData;
    const now = Date.now();

    // Calculate expiration if timer is set
    const calculatedExpiresAt = expiresAt || (timerSeconds > 0 ? now + (timerSeconds * 1000) : null);

    const existing = this.getMessageById(messageId);
    if (existing) {
      return existing;
    }

    db.prepare(`
      INSERT INTO messages (
        message_id, chat_id, sender_id, sender_dry_chat_id, sender_name,
        message_type, content, reply_to_message_id, reply_preview,
        forwarded_from_message_id, is_forwarded, attachment_id,
        created_at, updated_at, sync_status, is_starred,
        timer_seconds, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run([
      messageId, chatId, senderId, senderDryChatId, senderName,
      messageType, content, replyToMessageId, replyPreview,
      forwardedFromMessageId, isForwarded ? 1 : 0, attachmentId,
      createdAt, now, syncStatus,
      timerSeconds || 0, calculatedExpiresAt
    ]);

    return this.getMessageById(messageId);
  }

  purgeExpiredMessages() {
    const now = Date.now();
    const expired = db.prepare(`
      SELECT message_id, chat_id FROM messages
      WHERE expires_at IS NOT NULL AND expires_at <= ? AND deleted = 0
    `).all([now]);

    if (expired.length > 0) {
      db.prepare(`
        DELETE FROM messages
        WHERE expires_at IS NOT NULL AND expires_at <= ?
      `).run([now]);
    }
    return expired;
  }

  getMessageById(messageId) {
    const msg = db.prepare('SELECT * FROM messages WHERE message_id = ?').get([messageId]);
    if (!msg) return null;
    msg.reactions = this.getReactions(messageId);
    if (msg.attachment_id) {
      msg.attachment = db.prepare('SELECT * FROM attachments WHERE attachment_id = ?').get([msg.attachment_id]);
    }
    return msg;
  }

  getMessagesByChatId(chatId, limit = 50, beforeTimestamp = null) {
    let sql = 'SELECT * FROM messages WHERE chat_id = ? AND deleted = 0';
    const params = [chatId];

    if (beforeTimestamp) {
      sql += ' AND created_at < ?';
      params.push(beforeTimestamp);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(params);
    // Reverse so oldest in current window is at the top
    const messages = rows.reverse();

    for (const msg of messages) {
      if (msg.deleted_for_everyone) {
        msg.content = 'This message was deleted';
        msg.attachment = null;
        msg.attachment_id = null;
        msg.message_type = 'text';
      } else {
        msg.reactions = this.getReactions(msg.message_id);
        if (msg.attachment_id) {
          msg.attachment = db.prepare('SELECT * FROM attachments WHERE attachment_id = ?').get([msg.attachment_id]);
        }
      }
    }

    return messages;
  }

  updateSyncStatus(messageId, status, deliveredAt = null, readAt = null) {
    const now = Date.now();
    db.prepare(`
      UPDATE messages
      SET sync_status = ?,
          delivered_at = COALESCE(?, delivered_at),
          read_at = COALESCE(?, read_at),
          updated_at = ?
      WHERE message_id = ?
    `).run([status, deliveredAt, readAt, now, messageId]);
  }

  editMessage(messageId, newContent) {
    const now = Date.now();
    db.prepare(`
      UPDATE messages
      SET content = ?, edited = 1, updated_at = ?
      WHERE message_id = ?
    `).run([newContent, now, messageId]);
    return this.getMessageById(messageId);
  }

  deleteMessageForMe(messageId) {
    db.transaction(() => {
      db.prepare('DELETE FROM message_reactions WHERE message_id = ?').run([messageId]);
      db.prepare('DELETE FROM attachments WHERE message_id = ?').run([messageId]);
      db.prepare('DELETE FROM messages WHERE message_id = ?').run([messageId]);
    });
  }

  deleteMessageForEveryone(messageId) {
    db.transaction(() => {
      db.prepare('DELETE FROM attachments WHERE message_id = ?').run([messageId]);
      db.prepare(`
        UPDATE messages
        SET content = 'This message was deleted',
            message_type = 'text',
            attachment_id = NULL,
            deleted_for_everyone = 1,
            updated_at = ?
        WHERE message_id = ?
      `).run([Date.now(), messageId]);
    });
  }

  setStarred(messageId, isStarred = 1) {
    db.prepare('UPDATE messages SET is_starred = ?, updated_at = ? WHERE message_id = ?').run([isStarred ? 1 : 0, Date.now(), messageId]);
  }

  getStarredMessages() {
    const messages = db.prepare('SELECT * FROM messages WHERE is_starred = 1 ORDER BY created_at DESC').all();
    for (const msg of messages) {
      msg.reactions = this.getReactions(msg.message_id);
      if (msg.attachment_id) {
        msg.attachment = db.prepare('SELECT * FROM attachments WHERE attachment_id = ?').get([msg.attachment_id]);
      }
    }
    return messages;
  }

  searchMessages(query, chatId = null) {
    let sql = `
      SELECT m.*, c.title as chat_title
      FROM messages m
      JOIN chats c ON m.chat_id = c.chat_id
      WHERE m.content LIKE ? AND m.deleted = 0 AND m.deleted_for_everyone = 0
    `;
    const params = [`%${query}%`];

    if (chatId) {
      sql += ' AND m.chat_id = ?';
      params.push(chatId);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT 50';
    return db.prepare(sql).all(params);
  }

  // Reactions
  addReaction(messageId, chatId, userId, emoji) {
    const now = Date.now();
    const existing = db.prepare(`
      SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?
    `).get([messageId, userId, emoji]);

    if (existing) {
      // Toggle off
      db.prepare('DELETE FROM message_reactions WHERE id = ?').run([existing.id]);
      return { action: 'removed', emoji };
    } else {
      db.prepare(`
        INSERT INTO message_reactions (message_id, chat_id, user_id, emoji, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run([messageId, chatId, userId, emoji, now]);
      return { action: 'added', emoji };
    }
  }

  getReactions(messageId) {
    return db.prepare(`
      SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
      FROM message_reactions
      WHERE message_id = ?
      GROUP BY emoji
    `).all([messageId]);
  }
}

module.exports = new MessageRepository();
