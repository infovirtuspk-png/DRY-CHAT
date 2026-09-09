const db = require('../index');

class SettingsRepository {
  getSetting(key, defaultValue = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get([key]);
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  setSetting(key, value) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const now = Date.now();
    const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get([key]);

    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run([valueStr, now, key]);
    } else {
      db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run([key, valueStr, now]);
    }
  }

  getAllSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  }

  getPrivacySettings(userId) {
    const row = db.prepare('SELECT * FROM privacy_settings WHERE user_id = ?').get([userId]);
    if (!row) {
      // Default privacy settings
      return {
        user_id: userId,
        last_seen: 'everyone',
        online_status: 'everyone',
        profile_photo: 'everyone',
        about: 'everyone',
        read_receipts: 1,
        typing_indicator: 1,
        unknown_messages: 'everyone'
      };
    }
    return row;
  }

  updatePrivacySettings(userId, updates) {
    const current = this.getPrivacySettings(userId);
    const updated = { ...current, ...updates, updated_at: Date.now() };

    db.prepare(`
      INSERT INTO privacy_settings (user_id, last_seen, online_status, profile_photo, about, read_receipts, typing_indicator, unknown_messages, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        last_seen = excluded.last_seen,
        online_status = excluded.online_status,
        profile_photo = excluded.profile_photo,
        about = excluded.about,
        read_receipts = excluded.read_receipts,
        typing_indicator = excluded.typing_indicator,
        unknown_messages = excluded.unknown_messages,
        updated_at = excluded.updated_at
    `).run([
      userId,
      updated.last_seen,
      updated.online_status,
      updated.profile_photo,
      updated.about,
      updated.read_receipts ? 1 : 0,
      updated.typing_indicator ? 1 : 0,
      updated.unknown_messages,
      updated.updated_at
    ]);

    return this.getPrivacySettings(userId);
  }
}

module.exports = new SettingsRepository();
