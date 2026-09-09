-- Migration 006: Privacy Settings and Search History
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id TEXT PRIMARY KEY,
  last_seen TEXT DEFAULT 'everyone',
  online_status TEXT DEFAULT 'everyone',
  profile_photo TEXT DEFAULT 'everyone',
  about TEXT DEFAULT 'everyone',
  read_receipts INTEGER DEFAULT 1,
  typing_indicator INTEGER DEFAULT 1,
  unknown_messages TEXT DEFAULT 'everyone',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  query_type TEXT DEFAULT 'global',
  created_at INTEGER NOT NULL
);
