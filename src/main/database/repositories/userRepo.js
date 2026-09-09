const db = require('../index');

class UserRepository {
  createUser(userData) {
    const { firebaseUid, dryChatId, name, email, username = '', avatarPath = '', about = 'Available on Dry Chat' } = userData;
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO users (firebase_uid, dry_chat_id, name, email, username, avatar_path, about, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([firebaseUid, dryChatId, name, email, username, avatarPath, about, now, now]);
    return this.getUserByUid(firebaseUid);
  }

  getUserByUid(firebaseUid) {
    return db.prepare('SELECT * FROM users WHERE firebase_uid = ?').get([firebaseUid]);
  }

  getUserByDryChatId(dryChatId) {
    return db.prepare('SELECT * FROM users WHERE dry_chat_id = ?').get([dryChatId]);
  }

  getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get([email]);
  }

  updateProfile(firebaseUid, updates) {
    const { name, username, avatarPath, about } = updates;
    const now = Date.now();

    const current = this.getUserByUid(firebaseUid);
    if (!current) return null;

    const newName = name !== undefined ? name : current.name;
    const newUsername = username !== undefined ? username : current.username;
    const newAvatar = avatarPath !== undefined ? avatarPath : current.avatar_path;
    const newAbout = about !== undefined ? about : current.about;

    db.prepare(`
      UPDATE users
      SET name = ?, username = ?, avatar_path = ?, about = ?, updated_at = ?
      WHERE firebase_uid = ?
    `).run([newName, newUsername, newAvatar, newAbout, now, firebaseUid]);

    return this.getUserByUid(firebaseUid);
  }

  getCurrentSession() {
    return db.prepare('SELECT * FROM sessions WHERE is_current = 1 ORDER BY last_active DESC LIMIT 1').get();
  }

  saveSession(sessionData) {
    const { sessionToken, firebaseUid, dryChatId, deviceName } = sessionData;
    const now = Date.now();

    // Mark previous sessions as not current
    db.prepare('UPDATE sessions SET is_current = 0').run();

    db.prepare(`
      INSERT INTO sessions (session_token, firebase_uid, dry_chat_id, device_name, is_current, last_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run([sessionToken, firebaseUid, dryChatId, deviceName, now, now]);
  }

  clearSessions() {
    db.prepare('DELETE FROM sessions').run();
  }
}

module.exports = new UserRepository();
