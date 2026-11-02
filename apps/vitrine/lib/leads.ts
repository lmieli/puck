import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getWhatsApp } from "./analytics";
import { HttpError } from "./auth";
import { DATA_DIR, db } from "./db";
import {
  DeliveryError,
  enqueue,
  processDue,
  type Handler,
} from "./deliveries-core";
import { appUrl, mailConfigured, sendMail } from "./mail";
import { createLeadPage, readNotionConfig } from "./notion-send";
import { allowPrivateFromEnv, parseWebhookUrl, safeRequest } from "./netguard";
import { checkAndHit, parseLimits, rulesFor } from "./ratelimit";
import { getPublished, getSiteBySlug, log, normalizePath } from "./repo";
import { decrypt, deriveKey } from "./secrets";
import {
  checkSubmission,
  leadEmail,
  readForm,
  webhookPayload,
  type FormDef,
  type LeadRow,
} from "./signup";
import { sanitizeOrigin } from "./tracking";
import { whatsappUrl } from "./whatsapp";

/* ------------------------------------------------------------------ */
/* Keys and client address                                               */
/* ------------------------------------------------------------------ */

let cachedKey: Buffer | null = null;

/**
 * Key that seals stored secrets. VITRINE_SECRET_KEY is the right place for it
 * (it then lives apart from the database). Without it a random key is created
 * once in the data folder, which still keeps a copied database unreadable but
 * is weaker, so production should set the variable.
 */
export function secretKey(): Buffer {
  if (cachedKey) return cachedKey;
  const fromEnv = process.env.VITRINE_SECRET_KEY;
  if (fromEnv) return (cachedKey = deriveKey(fromEnv));
  const file = path.join(/*turbopackIgnore: true*/ DATA_DIR, "secret.key");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, randomUUID() + randomUUID(), { mode: 0o600 });
    console.warn(
      "VITRINE_SECRET_KEY não está definida: usando uma chave gerada em data/secret.key. Defina a variável em produção."
    );
  }
  return (cachedKey = deriveKey(fs.readFileSync(file, "utf8")));
}

/**
 * The visitor's address as seen by OUR proxy: the last entry of
 * X-Forwarded-For. Entries before it were typed by the visitor, so taking the
 * first one would let anyone dodge the limits by sending their own header.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1].slice(0, 64);
  }
  return (req.headers.get("x-real-ip") || "local").slice(0, 64);
}

/* ------------------------------------------------------------------ */
/* Receiving a lead                                                      */
/* ------------------------------------------------------------------ */

/** A form submitted in under this many ms was filled by a program, not a person. */
export const MIN_FILL_MS = 2000;
const TOO_MANY =
  "Muitos envios em pouco tempo. Tente de novo em alguns minutos.";

export type LeadInput = {
  slug: string;
  path: string;
  /** Id of the "Cadastro" block; absent for the classic contact form. */
  blockId?: string;
  values?: unknown;
  consent?: unknown;
  /** Trap field: people never see it, programs fill it. */
  hp?: unknown;
  /** Milliseconds between showing the form and sending it. */
  elapsedMs?: unknown;
  origin?: unknown;
  ip: string;
};

/** The classic contact form as a form definition, so one set of rules serves both. */
const CLASSIC: FormDef = {
  name: "",
  consentOn: false,
  consentText: "",
  fields: [
    { kind: "name", label: "Nome", required: true, options: "" },
    { kind: "email", label: "E-mail", required: true, options: "" },
    { kind: "phone", label: "Telefone", required: false, options: "" },
    { kind: "longtext", label: "Mensagem", required: false, options: "" },
  ],
};

export function submitLead(input: LeadInput): { ok: true; whatsapp?: string } {
  const site = getSiteBySlug(input.slug);
  if (!site) throw new HttpError(404, "Site não encontrado.");
  const conn = db();
  const limits = parseLimits(site.limits);

  // 1. Per-address limits come first and count every attempt.
  const ipRules = rulesFor(input.ip, site.id, "", limits).slice(0, 2);
  if (!checkAndHit(conn, ipRules).allowed) throw new HttpError(429, TOO_MANY);

  // 2. Traps for programs. They get a normal "ok" so they learn nothing.
  const classic = !input.blockId;
  if (String(input.hp ?? "").trim()) return { ok: true };
  const elapsed = Number(input.elapsedMs);
  if (
    input.elapsedMs !== undefined &&
    Number.isFinite(elapsed) &&
    elapsed < MIN_FILL_MS
  )
    return { ok: true };
  if (!classic && !Number.isFinite(elapsed)) return { ok: true };

  // 3. The form definition comes from the published page, never from the browser.
  let form = CLASSIC;
  let after: { mode: string; message: string } = {
    mode: "message",
    message: "",
  };
  const pagePath = normalizePath(input.path || "/");
  if (!classic) {
    const page = getPublished(site.id, pagePath);
    const block = page?.content.find(
      (b) => b.type === "Signup" && b.props.id === input.blockId
    );
    if (!block)
      throw new HttpError(
        400,
        "Formulário não encontrado. Recarregue a página."
      );
    form = readForm(block.props);
    after = {
      mode: block.props.after === "whatsapp" ? "whatsapp" : "message",
      message: String(block.props.afterMessage ?? ""),
    };
  }

  // 4. Flood breaker for this form: one noisy form must not drown the rest.
  const breaker = rulesFor(input.ip, site.id, form.name, limits)[2];
  if (!checkAndHit(conn, [breaker]).allowed) {
    const first = checkAndHit(conn, [
      { key: `alert:${site.id}:${form.name}`, minutes: 60, limit: 1 },
    ]).allowed;
    if (first)
      log(
        site.id,
        null,
        "alerta",
        `O formulário "${form.name || "de contato"}" passou de ${
          limits.formPerHour
        } envios em 1 hora. Novos envios ficam bloqueados até a contagem baixar.`
      );
    throw new HttpError(429, TOO_MANY);
  }

  // 5. Check the values against the definition.
  const sent = (input.values ?? {}) as Record<string, unknown>;
  const mapped = classic
    ? Object.fromEntries(
        (["name", "email", "phone", "message"] as const)
          .map((k, i) => [`f${i}`, sent[k]] as const)
          .filter(([, v]) => typeof v === "string" && v !== "")
      )
    : input.values;
  const checked = checkSubmission(form, {
    values: mapped,
    consent: input.consent,
  });
  if (!checked.ok) throw new HttpError(400, checked.error);
  const c = checked.value;

  // 6. The same person sending twice in a day is one lead.
  const dedupe = classic
    ? `${c.email.toLowerCase()}|${c.message.slice(0, 120)}`
    : c.dedupe;
  if (dedupe) {
    const dup = conn
      .prepare(
        `SELECT id FROM leads WHERE site_id = ? AND form = ? AND dedupe = ?
         AND created_at > datetime('now', '-1 day') LIMIT 1`
      )
      .get(site.id, form.name, dedupe);
    if (dup) return { ok: true, whatsapp: whatsappFor(site, after) };
  }

  // 7. Save first, deliver afterwards.
  const id = randomUUID();
  conn
    .prepare(
      `INSERT INTO leads (id, site_id, page, name, email, phone, message, origin, form, data, consent, dedupe)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      site.id,
      pagePath.slice(0, 200),
      c.name,
      c.email,
      c.phone,
      c.message,
      JSON.stringify(sanitizeOrigin(input.origin)),
      form.name,
      JSON.stringify({ answers: c.answers, consentText: c.consentText }),
      c.consent ? 1 : 0,
      dedupe
    );
  if (
    enqueue(conn, site.id, id, Date.now(), mailConfigured() ? [] : ["email"])
  ) {
    ensureWorker();
    void processDeliveries();
  }
  return { ok: true, whatsapp: whatsappFor(site, after) };
}

/** Where "after sending" may send the person: the site's WhatsApp, with the block's phrase. */
function whatsappFor(
  site: { whatsapp: string },
  after: { mode: string; message: string }
): string | undefined {
  if (after.mode !== "whatsapp") return undefined;
  const w = getWhatsApp(site);
  return w.number
    ? whatsappUrl({ number: w.number, message: after.message || w.message })
    : undefined;
}

/* ------------------------------------------------------------------ */
/* Delivering                                                            */
/* ------------------------------------------------------------------ */

function siteOf(siteId: string) {
  return db()
    .prepare("SELECT slug, name FROM sites WHERE id = ?")
    .get(siteId) as { slug: string; name: string };
}

export const SIGNATURE_HEADER = "x-vitrine-signature";

/** HMAC the receiver can check: sha256 over "<timestamp>.<body>" with the webhook's secret. */
export function sign(secret: string, timestamp: string, body: string) {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex")}`;
}

/**
 * POST one lead to a webhook. Shared by the queue and by the "send a test"
 * button. Throws DeliveryError: `permanent` when trying again cannot help.
 */
export async function postWebhook(opts: {
  integration: { config: string };
  lead: LeadRow;
  site: { slug: string; name: string };
  deliveryId: string;
  event?: "lead.created" | "lead.test";
}): Promise<void> {
  const { integration, lead, site, deliveryId, event = "lead.created" } = opts;
  const cfg = JSON.parse(integration.config) as { url: string; secret: string };
  let url: string;
  let secret: string;
  try {
    url = decrypt(cfg.url, secretKey());
    secret = decrypt(cfg.secret, secretKey());
  } catch (e) {
    throw new DeliveryError((e as Error).message, true);
  }
  const allowPrivate = allowPrivateFromEnv();
  const parsed = parseWebhookUrl(url, allowPrivate);
  if ("error" in parsed) throw new DeliveryError(parsed.error, true);
  const body = JSON.stringify(webhookPayload(lead, site, event));
  const ts = String(Math.floor(Date.now() / 1000));
  let res;
  try {
    res = await safeRequest({
      url: parsed.url,
      body,
      allowPrivate,
      headers: {
        "content-type": "application/json",
        "user-agent": "Vitrine-Webhook/1",
        "x-vitrine-event": event,
        "x-vitrine-delivery": deliveryId,
        "x-vitrine-timestamp": ts,
        [SIGNATURE_HEADER]: sign(secret, ts, body),
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    throw new DeliveryError(msg, /bloqueado|interno/.test(msg));
  }
  if (res.status >= 200 && res.status < 300) return;
  if (res.status >= 300 && res.status < 400)
    throw new DeliveryError(
      `O destino redirecionou (HTTP ${res.status}). Use o endereço final.`,
      true
    );
  const retryable =
    res.status === 408 || res.status === 429 || res.status >= 500;
  throw new DeliveryError(
    `O destino respondeu HTTP ${res.status}.`,
    !retryable
  );
}

const sendWebhook: Handler = ({ delivery, lead, integration }) =>
  postWebhook({
    integration,
    lead,
    site: siteOf(delivery.site_id),
    deliveryId: delivery.id,
  });

const sendEmail: Handler = async ({ lead, integration, delivery }) => {
  if (!mailConfigured())
    throw new DeliveryError(
      "O envio de e-mail não está configurado no servidor (RESEND_API_KEY e VITRINE_MAIL_FROM).",
      true
    );
  const { to } = JSON.parse(integration.config) as { to: string };
  const site = siteOf(delivery.site_id);
  const { subject, text } = leadEmail(
    lead as LeadRow,
    site,
    appUrl(`/app/s/${site.slug}?tab=contatos`)
  );
  if (!(await sendMail(to, subject, text)))
    throw new DeliveryError("O serviço de e-mail recusou o envio.");
};

const sendNotion: Handler = async ({ lead, integration }) => {
  await createLeadPage({
    config: readNotionConfig(integration.config),
    lead: lead as LeadRow,
    key: secretKey(),
  });
};

export const handlers: Record<string, Handler> = {
  webhook: sendWebhook,
  notion: sendNotion,
  email: sendEmail,
};

let running = false;

/** Send what is due. Never throws: a failure is recorded on the delivery. */
export async function processDeliveries() {
  if (running) return;
  running = true;
  try {
    return await processDue(db(), handlers);
  } catch (e) {
    console.error("delivery worker", e);
  } finally {
    running = false;
  }
}

declare global {
  var __vitrineWorker: NodeJS.Timeout | undefined;
}

/** Retry timer: every 30 seconds, so deliveries due later are sent without a new lead. */
export function ensureWorker() {
  if (globalThis.__vitrineWorker) return;
  globalThis.__vitrineWorker = setInterval(
    () => void processDeliveries(),
    30_000
  );
  globalThis.__vitrineWorker.unref?.();
}
