const db = require('../index');

class GroupRepository {
  createGroup(groupData) {
    const {
      groupId,
      name,
      description = '',
      avatarPath = '',
      ownerId,
      permissionsSend = 'everyone',
      permissionsEdit = 'admins',
      permissionsInvite = 'everyone'
    } = groupData;
    const now = Date.now();

    db.prepare(`
      INSERT INTO groups (group_id, name, description, avatar_path, owner_id, permissions_send, permissions_edit, permissions_invite, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([groupId, name, description, avatarPath, ownerId, permissionsSend, permissionsEdit, permissionsInvite, now, now]);

    // Also add owner as member
    this.addMember(groupId, ownerId, '', 'owner');

    return this.getGroupById(groupId);
  }

  getGroupById(groupId) {
    const group = db.prepare('SELECT * FROM groups WHERE group_id = ?').get([groupId]);
    if (!group) return null;
    group.members = this.getMembers(groupId);
    return group;
  }

  updateGroup(groupId, updates) {
    const { name, description, avatarPath, permissionsSend, permissionsEdit, permissionsInvite } = updates;
    const now = Date.now();
    const current = this.getGroupById(groupId);
    if (!current) return null;

    db.prepare(`
      UPDATE groups
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          avatar_path = COALESCE(?, avatar_path),
          permissions_send = COALESCE(?, permissions_send),
          permissions_edit = COALESCE(?, permissions_edit),
          permissions_invite = COALESCE(?, permissions_invite),
          updated_at = ?
      WHERE group_id = ?
    `).run([
      name, description, avatarPath, permissionsSend, permissionsEdit, permissionsInvite, now, groupId
    ]);

    return this.getGroupById(groupId);
  }

  addMember(groupId, userId, dryChatId = '', role = 'member') {
    const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get([groupId, userId]);
    if (existing) {
      db.prepare('UPDATE group_members SET role = ? WHERE id = ?').run([role, existing.id]);
    } else {
      db.prepare(`
        INSERT INTO group_members (group_id, user_id, dry_chat_id, role, joined_at)
        VALUES (?, ?, ?, ?, ?)
      `).run([groupId, userId, dryChatId, role, Date.now()]);
    }
  }

  removeMember(groupId, userId) {
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run([groupId, userId]);
  }

  getMembers(groupId) {
    return db.prepare('SELECT * FROM group_members WHERE group_id = ?').all([groupId]);
  }

  getUserRole(groupId, userId) {
    const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get([groupId, userId]);
    return member ? member.role : null;
  }
}

module.exports = new GroupRepository();
