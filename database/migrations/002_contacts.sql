-- Migration 002: Contacts and Chats
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id TEXT NOT NULL,
  contact_user_id TEXT NOT NULL,
  contact_dry_chat_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_path TEXT,
  about TEXT,
  favorite INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  muted INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, contact_user_id)
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT UNIQUE NOT NULL,
  chat_type TEXT NOT NULL,
  title TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_message_id TEXT,
  last_message_content TEXT,
  last_message_time INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  muted INTEGER DEFAULT 0,
  draft TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS chat_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  dry_chat_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  left_at INTEGER DEFAULT NULL,
  UNIQUE(chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
