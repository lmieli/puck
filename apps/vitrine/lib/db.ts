import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_MODELS, RETIRED_DEFAULT_MODELS } from "../ai/pricing";
import { INDEXES, SCHEMA } from "./schema";
import { ensureParkflowSite, seed } from "./seed";

export const DATA_DIR =
  process.env.VITRINE_DATA_DIR ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "data");

declare global {
  var __vitrineDb: Database.Database | undefined;
}

/** Add columns introduced after the first release to existing databases. */
function migrate(conn: Database.Database) {
  const cols = (
    conn.prepare("PRAGMA table_info(sites)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!cols.includes("seo"))
    conn.exec("ALTER TABLE sites ADD COLUMN seo TEXT NOT NULL DEFAULT '{}'");
  if (!cols.includes("ai_model"))
    conn.exec("ALTER TABLE sites ADD COLUMN ai_model TEXT");
  if (!cols.includes("tracking"))
    conn.exec(
      "ALTER TABLE sites ADD COLUMN tracking TEXT NOT NULL DEFAULT '{}'"
    );
  if (!cols.includes("whatsapp"))
    conn.exec(
      "ALTER TABLE sites ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '{}'"
    );
  if (!cols.includes("head_script"))
    conn.exec(
      "ALTER TABLE sites ADD COLUMN head_script TEXT NOT NULL DEFAULT ''"
    );
  const leadCols = (
    conn.prepare("PRAGMA table_info(leads)").all() as { name: string }[]
  ).map((c) => c.name);
  for (const [col, ddl] of [
    ["origin", "TEXT NOT NULL DEFAULT ''"],
    ["form", "TEXT NOT NULL DEFAULT ''"],
    ["data", "TEXT NOT NULL DEFAULT ''"],
    ["consent", "INTEGER NOT NULL DEFAULT 0"],
    ["dedupe", "TEXT NOT NULL DEFAULT ''"],
  ])
    if (!leadCols.includes(col))
      conn.exec(`ALTER TABLE leads ADD COLUMN ${col} ${ddl}`);
  if (!cols.includes("limits"))
    conn.exec("ALTER TABLE sites ADD COLUMN limits TEXT NOT NULL DEFAULT '{}'");
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
  upgradeModelCatalog(conn);
}

// Version of the default model catalogue stored in PRAGMA user_version.
const MODEL_CATALOG_VERSION = 1;

/**
 * Brings databases seeded with an older catalogue up to date, once: adds the
 * new default models (keeping any the agency already edited) and disables the
 * retired defaults that no site uses. Sites that chose a retired model keep
 * it until the agency switches them.
 */
function upgradeModelCatalog(conn: Database.Database) {
  const version = conn.pragma("user_version", { simple: true }) as number;
  if (version >= MODEL_CATALOG_VERSION) return;
  const ins = conn.prepare(
    `INSERT OR IGNORE INTO ai_models (id, label, in_per_mtok, out_per_mtok)
     VALUES (?, ?, ?, ?)`
  );
  const retire = conn.prepare(
    `UPDATE ai_models SET enabled = 0 WHERE id = ?
     AND NOT EXISTS (SELECT 1 FROM sites WHERE ai_model = ?)`
  );
  conn.transaction(() => {
    for (const m of DEFAULT_MODELS)
      ins.run(m.id, m.label, m.inPerMtok, m.outPerMtok);
    for (const id of RETIRED_DEFAULT_MODELS) retire.run(id, id);
    conn.pragma(`user_version = ${MODEL_CATALOG_VERSION}`);
  })();
}

export function db(): Database.Database {
  if (!globalThis.__vitrineDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const conn = new Database(
      path.join(/*turbopackIgnore: true*/ DATA_DIR, "vitrine.db")
    );
    conn.exec(SCHEMA);
    migrate(conn);
    conn.exec(INDEXES);
    globalThis.__vitrineDb = conn;
    seed(conn);
    ensureParkflowSite(conn);
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
