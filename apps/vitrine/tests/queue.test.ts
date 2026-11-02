// Submission limits and the delivery queue, on an in-memory copy of the real
// schema and with a fake clock.

import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import {
  BACKOFF_MS,
  DeliveryError,
  MAX_ATTEMPTS,
  claimDue,
  enqueue,
  processDue,
  requeueStuck,
  retryNow,
  STUCK_MS,
  type DeliveryRow,
  type Handler,
} from "../lib/deliveries-core.ts";
import {
  DEFAULT_LIMITS,
  checkAndHit,
  parseLimits,
  resetCleanup,
  rulesFor,
  validateLimits,
} from "../lib/ratelimit.ts";
import { INDEXES, SCHEMA } from "../lib/schema.ts";

function freshDb() {
  const conn = new Database(":memory:");
  conn.exec(SCHEMA);
  conn.exec(INDEXES);
  conn
    .prepare(
      "INSERT INTO sites (id, slug, name) VALUES ('S1', 'gemini', 'Gemini')"
    )
    .run();
  conn
    .prepare(
      "INSERT INTO sites (id, slug, name) VALUES ('S2', 'outro', 'Outro')"
    )
    .run();
  return conn;
}
const addLead = (conn: Database.Database, id = "L1", siteId = "S1") =>
  conn
    .prepare(
      "INSERT INTO leads (id, site_id, page, name, email) VALUES (?, ?, '/', 'Ana', 'ana@x.co')"
    )
    .run(id, siteId);
const addIntegration = (
  conn: Database.Database,
  id: string,
  kind = "webhook",
  enabled = 1,
  siteId = "S1"
) =>
  conn
    .prepare(
      "INSERT INTO integrations (id, site_id, kind, name, config, enabled) VALUES (?, ?, ?, ?, '{}', ?)"
    )
    .run(id, siteId, kind, id, enabled);
const rows = (conn: Database.Database) =>
  conn
    .prepare("SELECT * FROM deliveries ORDER BY created_at, id")
    .all() as DeliveryRow[];
const T0 = Date.parse("2026-11-02T12:00:00Z");
const MIN = 60_000;

/* --------------------------------- limits --------------------------------- */

test("the limits default to values that do not punish real events", () => {
  assert.deepEqual(DEFAULT_LIMITS, {
    ipPer10Min: 30,
    ipPerDay: 200,
    formPerHour: 500,
  });
});

test("a limit lets N through and then blocks, without counting the blocked attempts", () => {
  const conn = freshDb();
  resetCleanup();
  const rules = [{ key: "ip:1.1.1.1", minutes: 10, limit: 3 }];
  for (let i = 0; i < 3; i++)
    assert.equal(checkAndHit(conn, rules, T0 + i * 1000).allowed, true);
  const v = checkAndHit(conn, rules, T0 + 5000);
  assert.equal(v.allowed, false);
  // Hammering while blocked does not extend the block.
  for (let i = 0; i < 50; i++) checkAndHit(conn, rules, T0 + 6000 + i);
  assert.equal(
    checkAndHit(conn, rules, T0 + 10 * MIN + 10_000).allowed,
    true,
    "free again once the window passed"
  );
});

test("the window slides: old hits stop counting minute by minute", () => {
  const conn = freshDb();
  resetCleanup();
  const rules = [{ key: "ip:a", minutes: 10, limit: 2 }];
  assert.equal(checkAndHit(conn, rules, T0).allowed, true);
  assert.equal(checkAndHit(conn, rules, T0 + 4 * MIN).allowed, true);
  assert.equal(checkAndHit(conn, rules, T0 + 5 * MIN).allowed, false);
  assert.equal(
    checkAndHit(conn, rules, T0 + 11 * MIN).allowed,
    true,
    "the first hit left the window"
  );
});

test("per-IP rules combine: a short burst limit and a daily one", () => {
  const conn = freshDb();
  resetCleanup();
  const rules = rulesFor("9.9.9.9", "S1", "Lista", {
    ipPer10Min: 3,
    ipPerDay: 5,
    formPerHour: 100,
  });
  for (let i = 0; i < 3; i++)
    assert.equal(checkAndHit(conn, rules, T0 + i).allowed, true);
  const blocked = checkAndHit(conn, rules, T0 + 100);
  assert.equal(
    blocked.allowed === false && blocked.blocked.minutes,
    10,
    "the 10-minute rule trips first"
  );
  // 15 minutes later the burst is over, but the day total remains: 3 used, 2 left.
  assert.equal(checkAndHit(conn, rules, T0 + 15 * MIN).allowed, true);
  assert.equal(checkAndHit(conn, rules, T0 + 16 * MIN).allowed, true);
  const day = checkAndHit(conn, rules, T0 + 17 * MIN);
  assert.equal(
    day.allowed === false && day.blocked.minutes,
    24 * 60,
    "now the daily rule trips"
  );
  assert.equal(
    checkAndHit(conn, rules, T0 + 25 * 60 * MIN).allowed,
    true,
    "next day"
  );
});

test("two people on the same IP count together, two IPs do not", () => {
  const conn = freshDb();
  resetCleanup();
  const a = rulesFor("1.1.1.1", "S1", "F", {
    ipPer10Min: 2,
    ipPerDay: 9,
    formPerHour: 100,
  });
  const b = rulesFor("2.2.2.2", "S1", "F", {
    ipPer10Min: 2,
    ipPerDay: 9,
    formPerHour: 100,
  });
  checkAndHit(conn, a, T0);
  checkAndHit(conn, a, T0);
  assert.equal(checkAndHit(conn, a, T0).allowed, false);
  assert.equal(
    checkAndHit(conn, b, T0).allowed,
    true,
    "another IP is unaffected"
  );
});

test("the flood breaker is per form and per site, so one noisy form does not silence others", () => {
  const conn = freshDb();
  resetCleanup();
  const lim = { ipPer10Min: 1000, ipPerDay: 1000, formPerHour: 3 };
  for (let i = 0; i < 3; i++)
    assert.equal(
      checkAndHit(conn, rulesFor(`10.0.0.${i}`, "S1", "Lista", lim), T0)
        .allowed,
      true
    );
  const tripped = checkAndHit(
    conn,
    rulesFor("10.0.0.9", "S1", "Lista", lim),
    T0
  );
  assert.equal(
    tripped.allowed === false && tripped.blocked.key,
    "form:S1:Lista"
  );
  assert.equal(
    checkAndHit(conn, rulesFor("10.0.0.9", "S1", "Newsletter", lim), T0)
      .allowed,
    true,
    "another form"
  );
  assert.equal(
    checkAndHit(conn, rulesFor("10.0.0.9", "S2", "Lista", lim), T0).allowed,
    true,
    "another site"
  );
  assert.equal(
    checkAndHit(conn, rulesFor("10.0.0.9", "S1", "Lista", lim), T0 + 61 * MIN)
      .allowed,
    true,
    "an hour later"
  );
});

test("counters are in the database, so a restart does not reset them", () => {
  const conn = freshDb();
  resetCleanup();
  const rules = [{ key: "ip:z", minutes: 10, limit: 1 }];
  checkAndHit(conn, rules, T0);
  resetCleanup(); // "restart": all in-memory state gone, the database remains
  assert.equal(checkAndHit(conn, rules, T0 + 1000).allowed, false);
});

test("old counters are cleaned up", () => {
  const conn = freshDb();
  resetCleanup();
  const rules = [{ key: "ip:old", minutes: 10, limit: 100 }];
  checkAndHit(conn, rules, T0);
  resetCleanup();
  checkAndHit(
    conn,
    [{ key: "ip:new", minutes: 10, limit: 100 }],
    T0 + 3 * 24 * 60 * MIN
  );
  const left = conn.prepare("SELECT key FROM rate_hits").all() as {
    key: string;
  }[];
  assert.deepEqual(
    left.map((r) => r.key),
    ["ip:new"]
  );
});

test("limits stored for a site are read safely and typed ones are validated", () => {
  assert.deepEqual(parseLimits(""), DEFAULT_LIMITS);
  assert.deepEqual(parseLimits("garbage"), DEFAULT_LIMITS);
  assert.deepEqual(
    parseLimits(
      JSON.stringify({ ipPer10Min: 50, ipPerDay: -1, formPerHour: "x" })
    ),
    { ipPer10Min: 50, ipPerDay: 200, formPerHour: 500 }
  );
  assert.deepEqual(
    parseLimits(JSON.stringify({ ipPer10Min: 1.5, ipPerDay: 1e9 })),
    DEFAULT_LIMITS
  );
  const ok = validateLimits({
    ipPer10Min: "40",
    ipPerDay: "300",
    formPerHour: "900",
  });
  assert.ok("value" in ok && ok.value.ipPer10Min === 40);
  for (const bad of [
    { ipPer10Min: "0", ipPerDay: "10", formPerHour: "10" },
    { ipPer10Min: "abc", ipPerDay: "10", formPerHour: "10" },
    { ipPer10Min: "5", ipPerDay: "10", formPerHour: "1e7" },
    { ipPer10Min: "2.5", ipPerDay: "10", formPerHour: "10" },
  ]) {
    const r = validateLimits(bad);
    assert.ok("error" in r, JSON.stringify(bad));
  }
  const crossed = validateLimits({
    ipPer10Min: "50",
    ipPerDay: "20",
    formPerHour: "10",
  });
  assert.ok("error" in crossed && /não pode ser maior/.test(crossed.error));
});

/* --------------------------------- deliveries --------------------------------- */

test("a new lead gets one pending delivery per enabled destination of its site", () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  addIntegration(conn, "I2", "email");
  addIntegration(conn, "I3", "webhook", 0);
  addIntegration(conn, "I4", "webhook", 1, "S2");
  assert.equal(enqueue(conn, "S1", "L1", T0), 2);
  assert.deepEqual(
    rows(conn)
      .map((r) => r.integration_id)
      .sort(),
    ["I1", "I2"]
  );
  assert.ok(
    rows(conn).every((r) => r.status === "pending" && r.next_at === T0)
  );
});

test("kinds the server cannot reach at all get no delivery, so they do not fail for every lead", () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1", "webhook");
  addIntegration(conn, "I2", "email");
  assert.equal(enqueue(conn, "S1", "L1", T0, ["email"]), 1);
  assert.deepEqual(
    rows(conn).map((r) => r.integration_id),
    ["I1"]
  );
});

test("a destination that answers marks the delivery sent", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  enqueue(conn, "S1", "L1", T0);
  const seen: string[] = [];
  const h: Handler = async ({ lead, integration }) => {
    seen.push(`${integration.id}:${lead.email}`);
  };
  assert.deepEqual(await processDue(conn, { webhook: h }, T0), {
    sent: 1,
    failed: 0,
  });
  assert.deepEqual(seen, ["I1:ana@x.co"]);
  const [d] = rows(conn);
  assert.equal(d.status, "sent");
  assert.ok(d.sent_at);
  assert.deepEqual(
    await processDue(conn, { webhook: h }, T0 + MIN),
    { sent: 0, failed: 0 },
    "not sent twice"
  );
});

test("failures are retried with a growing wait and then given up", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  enqueue(conn, "S1", "L1", T0);
  let calls = 0;
  const h: Handler = async () => {
    calls++;
    throw new DeliveryError("Destino fora do ar (503)");
  };
  let now = T0;
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    await processDue(conn, { webhook: h }, now);
    const d = rows(conn)[0];
    assert.equal(d.status, "pending", `attempt ${attempt} keeps it pending`);
    assert.equal(d.attempts, attempt);
    assert.equal(d.next_at, now + BACKOFF_MS[attempt - 1], "wait grows");
    assert.match(d.last_error, /503/);
    // Not due yet: nothing is sent early.
    await processDue(conn, { webhook: h }, d.next_at - 1);
    assert.equal(calls, attempt);
    now = d.next_at;
  }
  await processDue(conn, { webhook: h }, now);
  const last = rows(conn)[0];
  assert.equal(calls, MAX_ATTEMPTS);
  assert.equal(last.status, "failed");
  assert.equal(last.attempts, MAX_ATTEMPTS);
  await processDue(conn, { webhook: h }, now + 365 * 24 * 60 * MIN);
  assert.equal(
    calls,
    MAX_ATTEMPTS,
    "a failed delivery is not retried by itself"
  );
});

test("a permanent error (bad request, gone) fails at once", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  enqueue(conn, "S1", "L1", T0);
  await processDue(
    conn,
    {
      webhook: async () => {
        throw new DeliveryError("Endereço não existe (404)", true);
      },
    },
    T0
  );
  const d = rows(conn)[0];
  assert.equal(d.status, "failed");
  assert.equal(d.attempts, 1);
});

test("a failed delivery can be sent again by hand, from the first attempt, only on its own site", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  enqueue(conn, "S1", "L1", T0);
  await processDue(
    conn,
    {
      webhook: async () => {
        throw new DeliveryError("fora", true);
      },
    },
    T0
  );
  const id = rows(conn)[0].id;
  assert.equal(
    retryNow(conn, "S2", id, T0 + 1),
    false,
    "another site cannot retry it"
  );
  assert.equal(retryNow(conn, "S1", id, T0 + 1), true);
  assert.equal(retryNow(conn, "S1", id, T0 + 2), false, "only failed ones");
  const d = rows(conn)[0];
  assert.deepEqual([d.status, d.attempts, d.last_error], ["pending", 0, ""]);
  await processDue(conn, { webhook: async () => {} }, T0 + 1);
  assert.equal(rows(conn)[0].status, "sent");
});

test("a destination removed or disabled meanwhile fails the delivery instead of hanging", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  addIntegration(conn, "I2");
  enqueue(conn, "S1", "L1", T0);
  conn.prepare("UPDATE integrations SET enabled = 0 WHERE id = 'I1'").run();
  const sent: string[] = [];
  await processDue(
    conn,
    {
      webhook: async ({ integration }) => {
        sent.push(integration.id);
      },
    },
    T0
  );
  assert.deepEqual(sent, ["I2"]);
  const failed = rows(conn).find((r) => r.integration_id === "I1")!;
  assert.equal(failed.status, "failed");
  assert.match(failed.last_error, /removido ou desativado/);
});

test("a destination kind nobody handles fails clearly", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1", "carrier-pigeon");
  enqueue(conn, "S1", "L1", T0);
  await processDue(conn, {}, T0);
  assert.match(rows(conn)[0].last_error, /desconhecido: carrier-pigeon/);
});

test("deliveries interrupted mid-send (a restart) go back to the queue", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  enqueue(conn, "S1", "L1", T0);
  assert.equal(claimDue(conn, T0).length, 1);
  assert.equal(rows(conn)[0].status, "sending");
  assert.equal(claimDue(conn, T0 + 1).length, 0, "not handed out twice");
  assert.equal(
    requeueStuck(conn, T0 + STUCK_MS - 1),
    0,
    "still within the grace period"
  );
  assert.equal(requeueStuck(conn, T0 + STUCK_MS + 1), 1);
  let ran = 0;
  await processDue(
    conn,
    {
      webhook: async () => {
        ran++;
      },
    },
    T0 + STUCK_MS + 2
  );
  assert.equal(ran, 1);
});

test("one bad destination does not stop the others", async () => {
  const conn = freshDb();
  addLead(conn);
  addIntegration(conn, "I1");
  addIntegration(conn, "I2");
  enqueue(conn, "S1", "L1", T0);
  const r = await processDue(
    conn,
    {
      webhook: async ({ integration }) => {
        if (integration.id === "I1") throw new Error("boom");
      },
    },
    T0
  );
  assert.deepEqual(r, { sent: 1, failed: 1 });
});

test("deleting a lead or a site removes its deliveries", () => {
  const conn = freshDb();
  conn.pragma("foreign_keys = ON");
  addLead(conn);
  addIntegration(conn, "I1");
  enqueue(conn, "S1", "L1", T0);
  conn.prepare("DELETE FROM leads WHERE id = 'L1'").run();
  assert.equal(rows(conn).length, 0);
});
