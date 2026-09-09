-- Dry Chat Complete SQLite Schema

-- Migrations Tracking Table
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firebase_uid TEXT UNIQUE NOT NULL,
  dry_chat_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_path TEXT,
  about TEXT DEFAULT 'Available on Dry Chat',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_sync_at INTEGER DEFAULT 0
);

-- Contacts Table
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

-- Chats Table
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT UNIQUE NOT NULL,
  chat_type TEXT NOT NULL, -- 'direct' or 'group'
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

-- Chat Members Table
CREATE TABLE IF NOT EXISTS chat_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  dry_chat_id TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at INTEGER NOT NULL,
  left_at INTEGER DEFAULT NULL,
  UNIQUE(chat_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE NOT NULL,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_dry_chat_id TEXT,
  sender_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'system'
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
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'delivered', 'read', 'failed'
  is_starred INTEGER DEFAULT 0
);

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attachment_id TEXT UNIQUE NOT NULL,
  message_id TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image', 'video', 'file'
  mime_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  local_path TEXT,
  thumbnail_path TEXT,
  cloudinary_public_id TEXT,
  cloudinary_url TEXT,
  uploaded_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  downloaded_at INTEGER DEFAULT NULL,
  deletion_status TEXT DEFAULT 'pending' -- 'pending', 'processing', 'deleted', 'failed'
);

-- Media Cache Table
CREATE TABLE IF NOT EXISTS media_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id TEXT UNIQUE NOT NULL,
  message_id TEXT,
  local_path TEXT NOT NULL,
  file_hash TEXT,
  file_size INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_accessed INTEGER NOT NULL,
  is_temporary INTEGER DEFAULT 0
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_path TEXT,
  owner_id TEXT NOT NULL,
  permissions_send TEXT DEFAULT 'everyone', -- 'everyone' or 'admins'
  permissions_edit TEXT DEFAULT 'admins',   -- 'everyone' or 'admins'
  permissions_invite TEXT DEFAULT 'everyone', -- 'everyone' or 'admins'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  dry_chat_id TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at INTEGER NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Sync Queue Table
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id TEXT UNIQUE NOT NULL,
  operation_type TEXT NOT NULL, -- 'send_message', 'edit_message', 'delete_message', 'react_message', 'update_presence', 'add_contact'
  entity_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  next_retry_at INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at INTEGER NOT NULL
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Privacy Settings Table
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id TEXT PRIMARY KEY,
  last_seen TEXT DEFAULT 'everyone', -- 'everyone', 'contacts', 'nobody'
  online_status TEXT DEFAULT 'everyone', -- 'everyone', 'contacts', 'nobody'
  profile_photo TEXT DEFAULT 'everyone',
  about TEXT DEFAULT 'everyone',
  read_receipts INTEGER DEFAULT 1,
  typing_indicator INTEGER DEFAULT 1,
  unknown_messages TEXT DEFAULT 'everyone', -- 'everyone', 'requests', 'nobody'
  updated_at INTEGER NOT NULL
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  firebase_uid TEXT NOT NULL,
  dry_chat_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  is_current INTEGER DEFAULT 1,
  last_active INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  query_type TEXT DEFAULT 'global',
  created_at INTEGER NOT NULL
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON messages(sync_status);
CREATE INDEX IF NOT EXISTS idx_messages_is_starred ON messages(is_starred);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
CREATE INDEX IF NOT EXISTS idx_attachments_msg_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, next_retry_at);
