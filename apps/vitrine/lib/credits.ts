import "server-only";
import { costCredits, FALLBACK_MODEL_ID, type ModelPrice } from "@/ai/pricing";
import { HttpError, type User } from "./auth";
import { db, tx } from "./db";

export type AiModel = {
  id: string;
  label: string;
  in_per_mtok: number;
  out_per_mtok: number;
  enabled: number;
};

export type LedgerRow = {
  id: number;
  kind: "grant" | "adjust" | "usage";
  amount: number;
  balance_after: number;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  note: string;
  user_name: string | null;
  created_at: string;
};

const MODEL_ID = /^[a-z0-9][a-z0-9._-]*\/[a-zA-Z0-9._:+-]+$/;

export function listModels(onlyEnabled = false): AiModel[] {
  return db()
    .prepare(
      `SELECT * FROM ai_models ${
        onlyEnabled ? "WHERE enabled = 1" : ""
      } ORDER BY label`
    )
    .all() as AiModel[];
}

function requireSuper(user: User) {
  if (!user.is_super_admin)
    throw new HttpError(403, "Só a equipe da agência faz isso.");
}

export function saveModel(
  user: User,
  m: {
    id: string;
    label: string;
    inPerMtok: number;
    outPerMtok: number;
    enabled: boolean;
  }
) {
  requireSuper(user);
  const id = m.id.trim();
  if (!MODEL_ID.test(id))
    throw new HttpError(
      400,
      'Use o identificador da OpenRouter, como "anthropic/claude-sonnet-5.5".'
    );
  if (!m.label.trim()) throw new HttpError(400, "Dê um nome ao modelo.");
  const inP = Math.round(m.inPerMtok);
  const outP = Math.round(m.outPerMtok);
  if (!(inP >= 0 && outP >= 0))
    throw new HttpError(400, "Os preços não podem ser negativos.");
  db()
    .prepare(
      `INSERT INTO ai_models (id, label, in_per_mtok, out_per_mtok, enabled)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET label = excluded.label,
         in_per_mtok = excluded.in_per_mtok, out_per_mtok = excluded.out_per_mtok,
         enabled = excluded.enabled`
    )
    .run(id, m.label.trim().slice(0, 80), inP, outP, m.enabled ? 1 : 0);
}

export function removeModel(user: User, id: string) {
  requireSuper(user);
  const used = db()
    .prepare("SELECT COUNT(*) AS n FROM sites WHERE ai_model = ?")
    .get(id) as { n: number };
  if (used.n)
    throw new HttpError(
      409,
      "Há clientes usando este modelo. Troque o modelo deles antes de remover."
    );
  db().prepare("DELETE FROM ai_models WHERE id = ?").run(id);
}

export function setSiteModel(user: User, siteId: string, modelId: string) {
  requireSuper(user);
  if (modelId) {
    const m = db()
      .prepare("SELECT enabled FROM ai_models WHERE id = ?")
      .get(modelId) as { enabled: number } | undefined;
    if (!m) throw new HttpError(404, "Modelo não encontrado.");
  }
  db()
    .prepare("UPDATE sites SET ai_model = ? WHERE id = ?")
    .run(modelId || null, siteId);
}

/** Model a site uses (its own choice if still enabled, else the platform default). */
export function modelForSite(siteId: string): {
  id: string;
  label: string;
  price: ModelPrice;
} {
  const row = db()
    .prepare(
      `SELECT m.* FROM sites s JOIN ai_models m ON m.id = s.ai_model
       WHERE s.id = ? AND m.enabled = 1`
    )
    .get(siteId) as AiModel | undefined;
  const m =
    row ??
    (db()
      .prepare("SELECT * FROM ai_models WHERE id = ?")
      .get(FALLBACK_MODEL_ID) as AiModel | undefined) ??
    (listModels(true)[0] as AiModel | undefined);
  if (!m)
    throw new HttpError(
      503,
      "Nenhum modelo de IA está ativo. Avise a agência."
    );
  return {
    id: m.id,
    label: m.label,
    price: { inPerMtok: m.in_per_mtok, outPerMtok: m.out_per_mtok },
  };
}

export function balanceOf(siteId: string) {
  const r = db()
    .prepare("SELECT credits FROM sites WHERE id = ?")
    .get(siteId) as { credits: number } | undefined;
  return r?.credits ?? 0;
}

/** Add (or remove, with a negative amount) credits. Agency only. */
export function grantCredits(
  user: User,
  siteId: string,
  amount: number,
  note: string
) {
  requireSuper(user);
  const n = Math.trunc(amount);
  if (!Number.isFinite(n) || n === 0)
    throw new HttpError(400, "Informe uma quantidade de créditos.");
  if (Math.abs(n) > 100_000_000)
    throw new HttpError(400, "Quantidade grande demais.");
  return tx(() => {
    const conn = db();
    conn
      .prepare("UPDATE sites SET credits = credits + ? WHERE id = ?")
      .run(n, siteId);
    const balance = balanceOf(siteId);
    conn
      .prepare(
        `INSERT INTO credit_ledger (site_id, user_id, kind, amount, balance_after, note)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        siteId,
        user.id,
        n > 0 ? "grant" : "adjust",
        n,
        balance,
        note.slice(0, 200)
      );
    return balance;
  });
}

/** Charge the real tokens a call used. Returns the cost and the new balance. */
export function chargeUsage(
  siteId: string,
  userId: string | null,
  modelId: string,
  price: ModelPrice,
  inputTokens: number,
  outputTokens: number,
  note = ""
) {
  const cost = costCredits(price, inputTokens, outputTokens);
  if (cost === 0) return { cost, balance: balanceOf(siteId) };
  return tx(() => {
    const conn = db();
    conn
      .prepare("UPDATE sites SET credits = credits - ? WHERE id = ?")
      .run(cost, siteId);
    const balance = balanceOf(siteId);
    conn
      .prepare(
        `INSERT INTO credit_ledger (site_id, user_id, kind, amount, balance_after, model, input_tokens, output_tokens, note)
         VALUES (?, ?, 'usage', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        siteId,
        userId,
        -cost,
        balance,
        modelId,
        inputTokens,
        outputTokens,
        note.slice(0, 200)
      );
    return { cost, balance };
  });
}

export function listLedger(siteId: string, limit = 50): LedgerRow[] {
  return db()
    .prepare(
      `SELECT l.id, l.kind, l.amount, l.balance_after, l.model, l.input_tokens,
              l.output_tokens, l.note, u.name AS user_name, l.created_at
       FROM credit_ledger l LEFT JOIN users u ON u.id = l.user_id
       WHERE l.site_id = ? ORDER BY l.id DESC LIMIT ?`
    )
    .all(siteId, limit) as LedgerRow[];
}

/** Credits and tokens consumed in the last `days` days. */
export function usageSummary(siteId: string, days = 30) {
  return db()
    .prepare(
      `SELECT COALESCE(-SUM(amount), 0) AS credits,
              COALESCE(SUM(input_tokens), 0) AS input_tokens,
              COALESCE(SUM(output_tokens), 0) AS output_tokens,
              COUNT(*) AS calls
       FROM credit_ledger
       WHERE site_id = ? AND kind = 'usage' AND created_at >= datetime('now', ?)`
    )
    .get(siteId, `-${days} days`) as {
    credits: number;
    input_tokens: number;
    output_tokens: number;
    calls: number;
  };
}
