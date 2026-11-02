import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpError, type User } from "./auth";
import { db } from "./db";
import {
  DeliveryError,
  retryNow,
  type IntegrationRow,
} from "./deliveries-core";
import { postWebhook, processDeliveries, secretKey } from "./leads";
import { allowPrivateFromEnv, parseWebhookUrl } from "./netguard";
import { validateLimits } from "./ratelimit";
import { log, siteFor } from "./repo";
import { decrypt, encrypt, maskUrl } from "./secrets";
import type { LeadRow } from "./signup";

export const MAX_EMAILS = 5;
export const MAX_WEBHOOKS = 5;

export type IntegrationView = {
  id: string;
  kind: "email" | "webhook" | "notion";
  name: string;
  /** What to show: the address, or the host of the webhook (never the secret path). */
  display: string;
  enabled: boolean;
  created_at: string;
};

export function listIntegrations(siteId: string): IntegrationView[] {
  const rows = db()
    .prepare(
      "SELECT * FROM integrations WHERE site_id = ? ORDER BY created_at, id"
    )
    .all(siteId) as (IntegrationRow & { created_at: string })[];
  return rows.map((r) => {
    let display = "";
    try {
      const cfg = JSON.parse(r.config);
      display =
        r.kind === "email"
          ? String(cfg.to)
          : r.kind === "notion"
          ? String(cfg.dbTitle ?? "Notion")
          : maskUrl(decrypt(cfg.url, secretKey()));
    } catch {
      display = "(não foi possível ler)";
    }
    return {
      id: r.id,
      kind: r.kind as IntegrationView["kind"],
      name: r.name,
      display,
      enabled: !!r.enabled,
      created_at: r.created_at,
    };
  });
}

const count = (siteId: string, kind: string) =>
  (
    db()
      .prepare(
        "SELECT COUNT(*) AS n FROM integrations WHERE site_id = ? AND kind = ?"
      )
      .get(siteId, kind) as { n: number }
  ).n;

/** Notice by e-mail: one destination per address, so a failure never repeats the others. */
export function addEmailRecipient(user: User, slug: string, email: string) {
  const { site } = siteFor(user, slug, "admin");
  const to = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || to.length > 200)
    throw new HttpError(400, "Informe um e-mail válido.");
  if (count(site.id, "email") >= MAX_EMAILS)
    throw new HttpError(400, `No máximo ${MAX_EMAILS} e-mails por site.`);
  const dup = listIntegrations(site.id).some(
    (i) => i.kind === "email" && i.display === to
  );
  if (dup) throw new HttpError(400, "Esse e-mail já recebe os avisos.");
  db()
    .prepare(
      "INSERT INTO integrations (id, site_id, kind, name, config) VALUES (?, ?, 'email', ?, ?)"
    )
    .run(randomUUID(), site.id, to, JSON.stringify({ to }));
  log(site.id, user.id, "cadastros", `Aviso por e-mail ativado para ${to}.`);
}

/** Webhook. Returns the signing secret: shown once, then only stored sealed. */
export function addWebhook(
  user: User,
  slug: string,
  name: string,
  url: string
) {
  const { site } = siteFor(user, slug, "admin");
  const parsed = parseWebhookUrl(url, allowPrivateFromEnv());
  if ("error" in parsed) throw new HttpError(400, parsed.error);
  const label = name
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 60);
  if (!label)
    throw new HttpError(400, "Dê um nome ao webhook, por exemplo: Zapier.");
  if (count(site.id, "webhook") >= MAX_WEBHOOKS)
    throw new HttpError(400, `No máximo ${MAX_WEBHOOKS} webhooks por site.`);
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const key = secretKey();
  db()
    .prepare(
      "INSERT INTO integrations (id, site_id, kind, name, config) VALUES (?, ?, 'webhook', ?, ?)"
    )
    .run(
      randomUUID(),
      site.id,
      label,
      JSON.stringify({
        url: encrypt(parsed.url.toString(), key),
        secret: encrypt(secret, key),
      })
    );
  log(site.id, user.id, "cadastros", `Webhook "${label}" adicionado.`);
  return { secret };
}

export function removeIntegration(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  const r = db()
    .prepare("DELETE FROM integrations WHERE id = ? AND site_id = ?")
    .run(id, site.id);
  if (!r.changes) throw new HttpError(404, "Destino não encontrado.");
  log(site.id, user.id, "cadastros", "Destino de cadastros removido.");
}

/** Send a made-up lead to a webhook right now and say what happened. */
export async function testWebhook(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  const integration = db()
    .prepare(
      "SELECT * FROM integrations WHERE id = ? AND site_id = ? AND kind = 'webhook'"
    )
    .get(id, site.id) as IntegrationRow | undefined;
  if (!integration) throw new HttpError(404, "Webhook não encontrado.");
  const lead: LeadRow = {
    id: "teste",
    page: "/",
    name: "Maria Teste",
    email: "maria.teste@exemplo.com",
    phone: "(11) 91234-5678",
    message: "Este é um envio de teste da Vitrine.",
    origin: JSON.stringify({ utm_source: "teste" }),
    form: "Teste",
    data: JSON.stringify({
      answers: [
        { key: "f0", label: "Nome", kind: "name", value: "Maria Teste" },
        {
          key: "f1",
          label: "E-mail",
          kind: "email",
          value: "maria.teste@exemplo.com",
        },
      ],
      consentText: "",
    }),
    consent: 0,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  };
  try {
    await postWebhook({
      integration,
      lead,
      site: { slug: site.slug, name: site.name },
      deliveryId: `teste-${randomUUID()}`,
      event: "lead.test",
    });
    return { ok: true, message: "O destino respondeu com sucesso." };
  } catch (e) {
    const permanent = e instanceof DeliveryError && e.permanent;
    return {
      ok: false,
      message: `${(e as Error).message}${
        permanent ? "" : " Vale tentar de novo."
      }`,
    };
  }
}

export type DeliveryView = {
  id: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  last_error: string;
  created_at: string;
  sent_at: string | null;
  integration: string;
  kind: string;
  lead: string;
  form: string;
};

export function listDeliveries(siteId: string, limit = 40): DeliveryView[] {
  return db()
    .prepare(
      `SELECT d.id, d.status, d.attempts, d.last_error, d.created_at, d.sent_at,
              i.name AS integration, i.kind AS kind,
              COALESCE(NULLIF(l.name, ''), NULLIF(l.email, ''), l.phone, '—') AS lead,
              l.form AS form
       FROM deliveries d
       JOIN integrations i ON i.id = d.integration_id
       JOIN leads l ON l.id = d.lead_id
       WHERE d.site_id = ? ORDER BY d.created_at DESC, d.id LIMIT ?`
    )
    .all(siteId, limit) as DeliveryView[];
}

export function retryDelivery(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  if (!retryNow(db(), site.id, id))
    throw new HttpError(400, "Só dá para reenviar entregas que falharam.");
  void processDeliveries();
}

/** Submission limits of a site: platform admins only, because they protect the whole server. */
export function saveLimits(
  user: User,
  slug: string,
  input: Record<string, unknown>
) {
  if (!user.is_super_admin)
    throw new HttpError(403, "Só a equipe da agência pode alterar os limites.");
  const { site } = siteFor(user, slug, "admin");
  const r = validateLimits(input);
  if ("error" in r) throw new HttpError(400, r.error);
  db()
    .prepare("UPDATE sites SET limits = ? WHERE id = ?")
    .run(JSON.stringify(r.value), site.id);
  log(site.id, user.id, "cadastros", "Limites de envio alterados.");
}
