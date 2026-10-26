-- Existing tables are preserved. Verify their columns before importing content.
CREATE TABLE IF NOT EXISTS cms_documents (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, revision INTEGER DEFAULT 0 NOT NULL, updated_at TEXT NOT NULL);
