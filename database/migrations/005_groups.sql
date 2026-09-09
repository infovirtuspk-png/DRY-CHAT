-- Migration 005: Groups and Group Members
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_path TEXT,
  owner_id TEXT NOT NULL,
  permissions_send TEXT DEFAULT 'everyone',
  permissions_edit TEXT DEFAULT 'admins',
  permissions_invite TEXT DEFAULT 'everyone',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  dry_chat_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  UNIQUE(group_id, user_id)
);
