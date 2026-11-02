// Delivery queue. A new lead is saved first; sending it to e-mail, a webhook
// (and later Notion or Google) happens afterwards, one delivery per
// destination, with retries and a growing wait. A destination that is down
// never loses a lead and never breaks the form. Takes the connection and the
// handlers as arguments: no server runtime, fully testable with a fake clock.

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { LeadRow } from "./signup.ts";

/** Wait before the 2nd, 3rd... attempt. After the last one the delivery is marked failed. */
export const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];
export const MAX_ATTEMPTS = BACKOFF_MS.length + 1;
/** A delivery "sending" for longer than this was interrupted (restart): try again. */
export const STUCK_MS = 5 * 60_000;

export type DeliveryStatus = "pending" | "sending" | "sent" | "failed";

export type DeliveryRow = {
  id: string;
  site_id: string;
  lead_id: string;
  integration_id: string;
  status: DeliveryStatus;
  attempts: number;
  next_at: number;
  last_error: string;
  created_at: string;
  sent_at: string | null;
};

export type IntegrationRow = {
  id: string;
  site_id: string;
  kind: string;
  name: string;
  config: string;
  enabled: number;
};

/** Thrown by a handler. `permanent` means retrying cannot help (bad request, gone). */
export class DeliveryError extends Error {
  permanent: boolean;
  constructor(message: string, permanent = false) {
    super(message);
    this.permanent = permanent;
  }
}

export type Handler = (ctx: {
  delivery: DeliveryRow;
  lead: LeadRow;
  integration: IntegrationRow;
}) => Promise<void>;

/**
 * One pending delivery per enabled integration of the site. Kinds in
 * `skipKinds` get none: a destination the server cannot reach at all (e-mail
 * without a mail service) is reported once in the panel instead of failing
 * for every lead.
 */
export function enqueue(
  conn: Database.Database,
  siteId: string,
  leadId: string,
  now = Date.now(),
  skipKinds: string[] = []
): number {
  const targets = (
    conn
      .prepare(
        "SELECT id, kind FROM integrations WHERE site_id = ? AND enabled = 1"
      )
      .all(siteId) as { id: string; kind: string }[]
  ).filter((t) => !skipKinds.includes(t.kind));
  const ins = conn.prepare(
    `INSERT INTO deliveries (id, site_id, lead_id, integration_id, status, next_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  );
  for (const t of targets) ins.run(randomUUID(), siteId, leadId, t.id, now);
  return targets.length;
}

/** Put interrupted deliveries back in the queue. */
export function requeueStuck(conn: Database.Database, now: number): number {
  return conn
    .prepare(
      "UPDATE deliveries SET status = 'pending' WHERE status = 'sending' AND next_at < ?"
    )
    .run(now - STUCK_MS).changes;
}

/** Take the due deliveries, marking them so no other worker takes them too. */
export function claimDue(
  conn: Database.Database,
  now: number,
  limit = 20
): DeliveryRow[] {
  const due = conn
    .prepare(
      "SELECT * FROM deliveries WHERE status = 'pending' AND next_at <= ? ORDER BY next_at LIMIT ?"
    )
    .all(now, limit) as DeliveryRow[];
  const claim = conn.prepare(
    "UPDATE deliveries SET status = 'sending', next_at = ? WHERE id = ? AND status = 'pending'"
  );
  return due.filter((d) => claim.run(now, d.id).changes === 1);
}

export function markSent(conn: Database.Database, id: string) {
  conn
    .prepare(
      "UPDATE deliveries SET status = 'sent', last_error = '', sent_at = datetime('now') WHERE id = ?"
    )
    .run(id);
}

/** Record a failure: retry later with a longer wait, or give up. */
export function markFailed(
  conn: Database.Database,
  d: DeliveryRow,
  error: string,
  permanent: boolean,
  now: number
) {
  const attempts = d.attempts + 1;
  const giveUp = permanent || attempts >= MAX_ATTEMPTS;
  conn
    .prepare(
      "UPDATE deliveries SET status = ?, attempts = ?, next_at = ?, last_error = ? WHERE id = ?"
    )
    .run(
      giveUp ? "failed" : "pending",
      attempts,
      giveUp
        ? now
        : now + BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)],
      error.slice(0, 300),
      d.id
    );
}

/** Send a failed delivery again, from the first attempt. Returns false when it is not failed. */
export function retryNow(
  conn: Database.Database,
  siteId: string,
  id: string,
  now = Date.now()
): boolean {
  return (
    conn
      .prepare(
        `UPDATE deliveries SET status = 'pending', attempts = 0, next_at = ?, last_error = ''
         WHERE id = ? AND site_id = ? AND status = 'failed'`
      )
      .run(now, id, siteId).changes === 1
  );
}

/**
 * Run what is due. A handler that resolves means sent; one that throws a
 * DeliveryError (or anything else) schedules a retry or gives up.
 */
export async function processDue(
  conn: Database.Database,
  handlers: Record<string, Handler>,
  now = Date.now(),
  limit = 20
): Promise<{ sent: number; failed: number }> {
  requeueStuck(conn, now);
  let sent = 0;
  let failed = 0;
  for (const delivery of claimDue(conn, now, limit)) {
    const integration = conn
      .prepare("SELECT * FROM integrations WHERE id = ?")
      .get(delivery.integration_id) as IntegrationRow | undefined;
    const lead = conn
      .prepare("SELECT * FROM leads WHERE id = ?")
      .get(delivery.lead_id) as LeadRow | undefined;
    if (!integration || !integration.enabled || !lead) {
      markFailed(
        conn,
        delivery,
        "O destino foi removido ou desativado.",
        true,
        now
      );
      failed++;
      continue;
    }
    const handler = handlers[integration.kind];
    if (!handler) {
      markFailed(
        conn,
        delivery,
        `Tipo de destino desconhecido: ${integration.kind}.`,
        true,
        now
      );
      failed++;
      continue;
    }
    try {
      await handler({ delivery, lead, integration });
      markSent(conn, delivery.id);
      sent++;
    } catch (e) {
      const err = e instanceof DeliveryError ? e : null;
      markFailed(
        conn,
        delivery,
        (e as Error).message || "Erro desconhecido.",
        !!err?.permanent,
        now
      );
      failed++;
    }
  }
  return { sent, failed };
}
