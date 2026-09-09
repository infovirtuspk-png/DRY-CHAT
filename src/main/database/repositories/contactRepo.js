const db = require('../index');

class ContactRepository {
  addContact(contactData) {
    const {
      ownerUserId,
      contactUserId,
      contactDryChatId,
      displayName,
      avatarPath = '',
      about = '',
      favorite = 0,
      blocked = 0,
      muted = 0
    } = contactData;
    const now = Date.now();

    const existing = db.prepare(`
      SELECT * FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?
    `).get([ownerUserId, contactUserId]);

    if (existing) {
      db.prepare(`
        UPDATE contacts
        SET contact_dry_chat_id = ?, display_name = ?, avatar_path = ?, about = ?, favorite = ?, blocked = ?, muted = ?, updated_at = ?
        WHERE id = ?
      `).run([contactDryChatId, displayName, avatarPath, about, favorite, blocked, muted, now, existing.id]);
      return this.getContactById(existing.id);
    }

    db.prepare(`
      INSERT INTO contacts (owner_user_id, contact_user_id, contact_dry_chat_id, display_name, avatar_path, about, favorite, blocked, muted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([ownerUserId, contactUserId, contactDryChatId, displayName, avatarPath, about, favorite, blocked, muted, now, now]);

    return db.prepare(`
      SELECT * FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?
    `).get([ownerUserId, contactUserId]);
  }

  getContacts(ownerUserId, options = {}) {
    let sql = 'SELECT * FROM contacts WHERE owner_user_id = ?';
    const params = [ownerUserId];

    if (options.blocked !== undefined) {
      sql += ' AND blocked = ?';
      params.push(options.blocked ? 1 : 0);
    } else {
      sql += ' AND blocked = 0';
    }

    if (options.favorite) {
      sql += ' AND favorite = 1';
    }

    sql += ' ORDER BY favorite DESC, display_name ASC';
    return db.prepare(sql).all(params);
  }

  getBlockedContacts(ownerUserId) {
    return db.prepare('SELECT * FROM contacts WHERE owner_user_id = ? AND blocked = 1 ORDER BY display_name ASC').all([ownerUserId]);
  }

  getContactById(id) {
    return db.prepare('SELECT * FROM contacts WHERE id = ?').get([id]);
  }

  getContactByUserId(ownerUserId, contactUserId) {
    return db.prepare('SELECT * FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?').get([ownerUserId, contactUserId]);
  }

  getContactByDryChatId(ownerUserId, dryChatId) {
    return db.prepare('SELECT * FROM contacts WHERE owner_user_id = ? AND contact_dry_chat_id = ?').get([ownerUserId, dryChatId]);
  }

  setBlocked(ownerUserId, contactUserId, blocked = 1, contactDryChatId = '', displayName = '') {
    const now = Date.now();
    const existing = db.prepare('SELECT * FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?').get([ownerUserId, contactUserId]);
    if (existing) {
      db.prepare(`
        UPDATE contacts SET blocked = ?, updated_at = ? WHERE id = ?
      `).run([blocked ? 1 : 0, now, existing.id]);
    } else {
      db.prepare(`
        INSERT INTO contacts (owner_user_id, contact_user_id, contact_dry_chat_id, display_name, avatar_path, about, favorite, blocked, muted, created_at, updated_at)
        VALUES (?, ?, ?, ?, '', '', 0, ?, 0, ?, ?)
      `).run([ownerUserId, contactUserId, contactDryChatId || contactUserId, displayName || 'Blocked User', blocked ? 1 : 0, now, now]);
    }
  }

  isBlocked(ownerUserId, contactUserId) {
    if (!ownerUserId || !contactUserId) return false;
    const contact = db.prepare('SELECT blocked FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?').get([ownerUserId, contactUserId]);
    return contact ? Boolean(contact.blocked) : false;
  }

  setFavorite(ownerUserId, contactUserId, favorite = 1) {
    const now = Date.now();
    db.prepare(`
      UPDATE contacts SET favorite = ?, updated_at = ? WHERE owner_user_id = ? AND contact_user_id = ?
    `).run([favorite ? 1 : 0, now, ownerUserId, contactUserId]);
  }

  setMuted(ownerUserId, contactUserId, muted = 1) {
    const now = Date.now();
    db.prepare(`
      UPDATE contacts SET muted = ?, updated_at = ? WHERE owner_user_id = ? AND contact_user_id = ?
    `).run([muted ? 1 : 0, now, ownerUserId, contactUserId]);
  }

  removeContact(ownerUserId, contactUserId) {
    db.prepare('DELETE FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?').run([ownerUserId, contactUserId]);
  }
}

module.exports = new ContactRepository();
