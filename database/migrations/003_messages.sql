-- Migration 003: Messages and Reactions
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE NOT NULL,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_dry_chat_id TEXT,
  sender_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  reply_to_message_id TEXT,
  reply_preview TEXT,
  forwarded_from_message_id TEXT,
  is_forwarded INTEGER DEFAULT 0,
  attachment_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  delivered_at INTEGER DEFAULT NULL,
  read_at INTEGER DEFAULT NULL,
  edited INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  deleted_for_everyone INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  is_starred INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON messages(sync_status);
CREATE INDEX IF NOT EXISTS idx_messages_is_starred ON messages(is_starred);
