import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_MODELS } from "../ai/pricing";
import { seed } from "./seed";

const DATA_DIR =
  process.env.VITRINE_DATA_DIR ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "data");

declare global {
  var __vitrineDb: Database.Database | undefined;
}

const SCHEMA = `
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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('invite', 'reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT
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

/** Add columns introduced after the first release to existing databases. */
function migrate(conn: Database.Database) {
  const cols = (
    conn.prepare("PRAGMA table_info(sites)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!cols.includes("ai_model"))
    conn.exec("ALTER TABLE sites ADD COLUMN ai_model TEXT");
  if (!cols.includes("credits"))
    conn.exec(
      "ALTER TABLE sites ADD COLUMN credits INTEGER NOT NULL DEFAULT 0"
    );
  const has = conn.prepare("SELECT COUNT(*) AS n FROM ai_models").get() as {
    n: number;
  };
  if (!has.n) {
    const ins = conn.prepare(
      "INSERT INTO ai_models (id, label, in_per_mtok, out_per_mtok) VALUES (?, ?, ?, ?)"
    );
    for (const m of DEFAULT_MODELS)
      ins.run(m.id, m.label, m.inPerMtok, m.outPerMtok);
  }
}

export function db(): Database.Database {
  if (!globalThis.__vitrineDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const conn = new Database(
      path.join(/*turbopackIgnore: true*/ DATA_DIR, "vitrine.db")
    );
    conn.exec(SCHEMA);
    migrate(conn);
    globalThis.__vitrineDb = conn;
    seed(conn);
  }
  return globalThis.__vitrineDb;
}

export function tx<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const out = fn();
    conn.exec("COMMIT");
    return out;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

export const uploadsDir = () =>
  path.join(/*turbopackIgnore: true*/ DATA_DIR, "uploads");
