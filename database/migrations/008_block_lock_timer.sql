-- Migration 008: Chat Lock, Block Status, and Disappearing Timer
ALTER TABLE chats ADD COLUMN is_locked INTEGER DEFAULT 0;
ALTER TABLE chats ADD COLUMN lock_pin TEXT DEFAULT NULL;
ALTER TABLE chats ADD COLUMN timer_seconds INTEGER DEFAULT 0;

ALTER TABLE messages ADD COLUMN timer_seconds INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN expires_at INTEGER DEFAULT NULL;
