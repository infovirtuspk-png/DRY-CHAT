const db = require('../index');

class ChatRepository {
  createOrUpdateChat(chatData) {
    const {
      chatId,
      chatType = 'direct',
      title,
      avatar = '',
      lastMessageId = null,
      lastMessageContent = '',
      lastMessageTime = 0,
      unreadCount = 0,
      pinned = 0,
      archived = 0,
      muted = 0
    } = chatData;
    const now = Date.now();

    const existing = this.getChatById(chatId);
    if (existing) {
      db.prepare(`
        UPDATE chats
        SET title = COALESCE(?, title),
            avatar = COALESCE(?, avatar),
            last_message_id = COALESCE(?, last_message_id),
            last_message_content = COALESCE(?, last_message_content),
            last_message_time = CASE WHEN ? > 0 THEN ? ELSE last_message_time END,
            unread_count = CASE WHEN ? >= 0 THEN ? ELSE unread_count END,
            pinned = COALESCE(?, pinned),
            archived = COALESCE(?, archived),
            muted = COALESCE(?, muted),
            updated_at = ?
        WHERE chat_id = ?
      `).run([
        title, avatar, lastMessageId, lastMessageContent,
        lastMessageTime, lastMessageTime,
        unreadCount, unreadCount,
        pinned, archived, muted, now, chatId
      ]);
      return this.getChatById(chatId);
    }

    db.prepare(`
      INSERT INTO chats (chat_id, chat_type, title, avatar, created_at, updated_at, last_message_id, last_message_content, last_message_time, unread_count, pinned, archived, muted, draft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')
    `).run([chatId, chatType, title, avatar, now, now, lastMessageId, lastMessageContent, lastMessageTime, unreadCount, pinned, archived, muted]);

    return this.getChatById(chatId);
  }

  getChatById(chatId) {
    const chat = db.prepare('SELECT * FROM chats WHERE chat_id = ?').get([chatId]);
    if (chat) this._resolveChatTitle(chat);
    return chat;
  }

  _resolveChatTitle(chat) {
    if (!chat) return;
    const currentSession = db.prepare('SELECT * FROM sessions WHERE is_current = 1 ORDER BY last_active DESC LIMIT 1').get();
    const currentUid = currentSession ? currentSession.firebase_uid : null;
    if (!currentUid) return;

    const currentUser = db.prepare('SELECT name FROM users WHERE firebase_uid = ?').get([currentUid]);
    const currentUserName = currentUser ? currentUser.name : '';

    if (chat.chat_type === 'direct' || (chat.chat_id && chat.chat_id.includes('_'))) {
      const parts = chat.chat_id.split('_');
      const otherUid = parts.find(u => u !== currentUid);

      if (!otherUid || otherUid === currentUid) return;

      if (chat.title === currentUserName || chat.title === 'Direct Message' || !chat.title) {
        // 1. Check contact table
        const contact = db.prepare('SELECT display_name FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?').get([currentUid, otherUid]);
        if (contact && contact.display_name) {
          chat.title = contact.display_name;
          db.prepare('UPDATE chats SET title = ? WHERE chat_id = ?').run([chat.title, chat.chat_id]);
          return;
        }

        // 2. Check other user's messages in this chat
        const otherMsg = db.prepare(`SELECT sender_name FROM messages WHERE chat_id = ? AND sender_id = ? AND sender_name != '' LIMIT 1`).get([chat.chat_id, otherUid]);
        if (otherMsg && otherMsg.sender_name && otherMsg.sender_name !== currentUserName) {
          chat.title = otherMsg.sender_name;
          db.prepare('UPDATE chats SET title = ? WHERE chat_id = ?').run([chat.title, chat.chat_id]);
          return;
        }

        // 3. Check local users table
        const otherUser = db.prepare('SELECT name FROM users WHERE firebase_uid = ?').get([otherUid]);
        if (otherUser && otherUser.name && otherUser.name !== currentUserName) {
          chat.title = otherUser.name;
          db.prepare('UPDATE chats SET title = ? WHERE chat_id = ?').run([chat.title, chat.chat_id]);
        }
      }
    }
  }

  getAllChats(options = {}) {
    let sql = 'SELECT * FROM chats WHERE 1=1';
    const params = [];

    if (options.archived !== undefined) {
      sql += ' AND archived = ?';
      params.push(options.archived ? 1 : 0);
    } else {
      sql += ' AND archived = 0';
    }

    sql += ' ORDER BY pinned DESC, last_message_time DESC, updated_at DESC';
    const chats = db.prepare(sql).all(params);
    chats.forEach(c => this._resolveChatTitle(c));
    return chats;
  }

  getArchivedChats() {
    const chats = db.prepare('SELECT * FROM chats WHERE archived = 1 ORDER BY last_message_time DESC, updated_at DESC').all();
    chats.forEach(c => this._resolveChatTitle(c));
    return chats;
  }

  updateLastMessage(chatId, messageId, content, timestamp) {
    const now = Date.now();
    db.prepare(`
      UPDATE chats
      SET last_message_id = ?, last_message_content = ?, last_message_time = ?, updated_at = ?
      WHERE chat_id = ?
    `).run([messageId, content, timestamp, now, chatId]);
  }

  incrementUnread(chatId) {
    db.prepare('UPDATE chats SET unread_count = unread_count + 1, updated_at = ? WHERE chat_id = ?').run([Date.now(), chatId]);
  }

  resetUnread(chatId) {
    db.prepare('UPDATE chats SET unread_count = 0, updated_at = ? WHERE chat_id = ?').run([Date.now(), chatId]);
  }

  setPinned(chatId, pinned = 1) {
    db.prepare('UPDATE chats SET pinned = ?, updated_at = ? WHERE chat_id = ?').run([pinned ? 1 : 0, Date.now(), chatId]);
  }

  setArchived(chatId, archived = 1) {
    db.prepare('UPDATE chats SET archived = ?, updated_at = ? WHERE chat_id = ?').run([archived ? 1 : 0, Date.now(), chatId]);
  }

  setMuted(chatId, muted = 1) {
    db.prepare('UPDATE chats SET muted = ?, updated_at = ? WHERE chat_id = ?').run([muted ? 1 : 0, Date.now(), chatId]);
  }

  saveDraft(chatId, draftText) {
    db.prepare('UPDATE chats SET draft = ? WHERE chat_id = ?').run([draftText, chatId]);
  }

  getDraft(chatId) {
    const chat = this.getChatById(chatId);
    return chat ? chat.draft : '';
  }

  setChatLock(chatId, isLocked, pin = null) {
    const now = Date.now();
    db.prepare(`
      UPDATE chats
      SET is_locked = ?, lock_pin = ?, updated_at = ?
      WHERE chat_id = ?
    `).run([isLocked ? 1 : 0, isLocked ? pin : null, now, chatId]);
    return this.getChatById(chatId);
  }

  verifyChatLock(chatId, pin) {
    const chat = db.prepare('SELECT is_locked, lock_pin FROM chats WHERE chat_id = ?').get([chatId]);
    if (!chat || !chat.is_locked) return true;
    return String(chat.lock_pin) === String(pin);
  }

  setChatTimer(chatId, timerSeconds) {
    const now = Date.now();
    db.prepare(`
      UPDATE chats
      SET timer_seconds = ?, updated_at = ?
      WHERE chat_id = ?
    `).run([parseInt(timerSeconds, 10) || 0, now, chatId]);
    return this.getChatById(chatId);
  }

  refreshLastMessage(chatId) {
    const latest = db.prepare(`
      SELECT message_id, content, created_at
      FROM messages
      WHERE chat_id = ? AND deleted = 0
      ORDER BY created_at DESC
      LIMIT 1
    `).get([chatId]);

    const now = Date.now();
    if (latest) {
      db.prepare(`
        UPDATE chats
        SET last_message_id = ?, last_message_content = ?, last_message_time = ?, updated_at = ?
        WHERE chat_id = ?
      `).run([latest.message_id, latest.content, latest.created_at, now, chatId]);
    } else {
      db.prepare(`
        UPDATE chats
        SET last_message_id = NULL, last_message_content = '', last_message_time = 0, updated_at = ?
        WHERE chat_id = ?
      `).run([now, chatId]);
    }
  }

  deleteChat(chatId) {
    db.transaction(() => {
      const msgs = db.prepare('SELECT message_id FROM messages WHERE chat_id = ?').all([chatId]);
      for (const m of msgs) {
        db.prepare('DELETE FROM attachments WHERE message_id = ?').run([m.message_id]);
      }
      db.prepare('DELETE FROM messages WHERE chat_id = ?').run([chatId]);
      db.prepare('DELETE FROM message_reactions WHERE chat_id = ?').run([chatId]);
      db.prepare(`
        UPDATE chats
        SET last_message_id = NULL, last_message_content = '', last_message_time = 0, unread_count = 0, draft = '', updated_at = ?
        WHERE chat_id = ?
      `).run([Date.now(), chatId]);
    });
  }

  // Member management
  addMember(chatId, userId, dryChatId, role = 'member') {
    const existing = db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?').get([chatId, userId]);
    if (existing) {
      db.prepare('UPDATE chat_members SET role = ?, left_at = NULL WHERE id = ?').run([role, existing.id]);
    } else {
      db.prepare(`
        INSERT INTO chat_members (chat_id, user_id, dry_chat_id, role, joined_at)
        VALUES (?, ?, ?, ?, ?)
      `).run([chatId, userId, dryChatId, role, Date.now()]);
    }
  }

  getMembers(chatId) {
    return db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND left_at IS NULL').all([chatId]);
  }
}

module.exports = new ChatRepository();
