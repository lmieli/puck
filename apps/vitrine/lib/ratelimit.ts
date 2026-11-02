// Submission limits kept in the database (so a restart does not reset them)
// as counters per minute. A rule is "at most N hits in the last M minutes for
// this key". Several rules can share a key (per IP: 30 in 10 minutes AND 200
// in a day). Takes the connection as an argument: no server runtime needed.

import type Database from "better-sqlite3";

export type Rule = { key: string; minutes: number; limit: number };

const MINUTE = 60_000;
let lastCleanup = 0;

export type Verdict = { allowed: true } | { allowed: false; blocked: Rule };

/**
 * Check every rule and, only if all pass, count one hit on each distinct key.
 * A blocked attempt is not counted, so it does not extend its own block.
 */
export function checkAndHit(
  conn: Database.Database,
  rules: Rule[],
  now = Date.now()
): Verdict {
  const bucket = Math.floor(now / MINUTE);
  const sum = conn.prepare(
    "SELECT COALESCE(SUM(count), 0) AS n FROM rate_hits WHERE key = ? AND bucket > ?"
  );
  for (const rule of rules) {
    const n = (sum.get(rule.key, bucket - rule.minutes) as { n: number }).n;
    if (n >= rule.limit) return { allowed: false, blocked: rule };
  }
  const hit = conn.prepare(
    `INSERT INTO rate_hits (key, bucket, count) VALUES (?, ?, 1)
     ON CONFLICT(key, bucket) DO UPDATE SET count = count + 1`
  );
  for (const key of new Set(rules.map((r) => r.key))) hit.run(key, bucket);
  cleanup(conn, now);
  return { allowed: true };
}

/** Drop counters older than two days, at most once an hour. */
function cleanup(conn: Database.Database, now: number) {
  if (now - lastCleanup < 60 * MINUTE) return;
  lastCleanup = now;
  conn
    .prepare("DELETE FROM rate_hits WHERE bucket < ?")
    .run(Math.floor(now / MINUTE) - 2 * 24 * 60);
}

/** Test hook: forget when the last cleanup ran. */
export function resetCleanup() {
  lastCleanup = 0;
}

/** Defaults, adjustable per site by the agency. */
export type Limits = {
  /** Submissions from one IP in 10 minutes. */
  ipPer10Min: number;
  /** Submissions from one IP in 24 hours. */
  ipPerDay: number;
  /** Submissions to one form in an hour: a flood breaker. */
  formPerHour: number;
};

export const DEFAULT_LIMITS: Limits = {
  ipPer10Min: 30,
  ipPerDay: 200,
  formPerHour: 500,
};

/** Read stored limits, ignoring anything that is not a sensible whole number. */
export function parseLimits(raw: string | null | undefined): Limits {
  let obj: Record<string, unknown> = {};
  try {
    const p = JSON.parse(raw || "{}");
    if (p && typeof p === "object") obj = p;
  } catch {
    // keep defaults
  }
  const pick = (k: keyof Limits) => {
    const n = Number(obj[k]);
    return Number.isInteger(n) && n >= 1 && n <= 100_000
      ? n
      : DEFAULT_LIMITS[k];
  };
  return {
    ipPer10Min: pick("ipPer10Min"),
    ipPerDay: pick("ipPerDay"),
    formPerHour: pick("formPerHour"),
  };
}

/** Validate what the agency typed for a site's limits. */
export function validateLimits(
  input: Record<string, unknown>
): { value: Limits } | { error: string } {
  const out = {} as Limits;
  const names: Record<keyof Limits, string> = {
    ipPer10Min: "Envios por IP em 10 minutos",
    ipPerDay: "Envios por IP em 24 horas",
    formPerHour: "Envios por formulário em 1 hora",
  };
  for (const k of Object.keys(names) as (keyof Limits)[]) {
    const n = Number(String(input[k] ?? "").trim());
    if (!Number.isInteger(n) || n < 1 || n > 100_000)
      return { error: `${names[k]}: informe um número inteiro de 1 a 100000.` };
    out[k] = n;
  }
  if (out.ipPer10Min > out.ipPerDay)
    return {
      error: "O limite de 10 minutos não pode ser maior que o de 24 horas.",
    };
  return { value: out };
}

/** The rules for one submission. */
export function rulesFor(
  ip: string,
  siteId: string,
  form: string,
  limits: Limits
): Rule[] {
  return [
    { key: `ip:${ip}`, minutes: 10, limit: limits.ipPer10Min },
    { key: `ip:${ip}`, minutes: 24 * 60, limit: limits.ipPerDay },
    { key: `form:${siteId}:${form}`, minutes: 60, limit: limits.formPerHour },
  ];
}
