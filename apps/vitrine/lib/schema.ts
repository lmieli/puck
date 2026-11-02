// The database schema, kept apart from db.ts (which needs the server runtime)
// so tests can build an identical in-memory database.

export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_super_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'blank',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE IF NOT EXISTS pages (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  draft TEXT NOT NULL,
  published TEXT,
  published_version INTEGER,
  review_requested INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  PRIMARY KEY (site_id, path)
);

CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  number INTEGER NOT NULL,
  data TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  author_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS versions_page ON versions (site_id, path, number DESC);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  host TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_check TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  -- Name of the form ("Lista de espera"); empty for the classic contact form.
  form TEXT NOT NULL DEFAULT '',
  -- JSON snapshot of what was asked and answered, plus the consent given.
  data TEXT NOT NULL DEFAULT '',
  consent INTEGER NOT NULL DEFAULT 0,
  -- Normalised e-mail or phone, to recognise the same person sending twice.
  dedupe TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Where a new lead is sent besides the dashboard: e-mail notices, webhooks.
-- "config" holds the target; secrets inside it are encrypted (lib/secrets.ts).
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per (lead, integration). The lead is always saved first; delivery
-- happens afterwards, with retries, so a down destination never loses a lead.
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_at INTEGER NOT NULL,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

-- Submission counters by minute, kept in the database so limits survive restarts.
CREATE TABLE IF NOT EXISTS rate_hits (
  key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, bucket)
);

CREATE TABLE IF NOT EXISTS tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('invite', 'reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS page_views (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day, path, source)
);

CREATE TABLE IF NOT EXISTS page_events (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day, path, source, kind)
);

CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  in_per_mtok INTEGER NOT NULL,
  out_per_mtok INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('grant', 'adjust', 'usage')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ledger_site ON credit_ledger (site_id, id DESC);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id TEXT,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Indexes on columns that older databases only get from migrate(), so they run
 * after it (db.ts) and not as part of SCHEMA.
 */
export const INDEXES = `
CREATE INDEX IF NOT EXISTS leads_site_form ON leads (site_id, form, created_at);
CREATE INDEX IF NOT EXISTS leads_dedupe ON leads (site_id, form, dedupe, created_at);
CREATE INDEX IF NOT EXISTS deliveries_due ON deliveries (status, next_at);
CREATE INDEX IF NOT EXISTS deliveries_site ON deliveries (site_id, created_at);
`;
