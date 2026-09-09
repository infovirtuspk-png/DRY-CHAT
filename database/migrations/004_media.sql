-- Migration 004: Attachments and Media Cache
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attachment_id TEXT UNIQUE NOT NULL,
  message_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
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
  deletion_status TEXT DEFAULT 'pending'
);

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

CREATE INDEX IF NOT EXISTS idx_attachments_msg_id ON attachments(message_id);
