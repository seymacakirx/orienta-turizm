-- Additive migration. Does not read, change or remove cms_documents.
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,
 credential_tag TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_sessions_expires ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS admin_login_limits (
 bucket TEXT PRIMARY KEY NOT NULL,
 window_start INTEGER NOT NULL,
 attempts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_login_limits_window ON admin_login_limits(window_start);
