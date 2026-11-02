import "server-only";
import { HttpError, type User } from "./auth";
import { db } from "./db";
import { getPublished, log, normalizePath, siteFor, type Site } from "./repo";
import {
  parseTracking,
  sanitizeOrigin,
  sourceLabel,
  summarizeViews,
  validateTracking,
  type Tracking,
  type ViewRow,
} from "./tracking";
import { parseWhatsApp, validateWhatsApp, type WhatsApp } from "./whatsapp";

export const MAX_HEAD_SCRIPT = 20_000;

export function getTracking(site: Pick<Site, "tracking">): Tracking {
  return parseTracking(site.tracking);
}

export function getWhatsApp(site: Pick<Site, "whatsapp">): WhatsApp {
  return parseWhatsApp(site.whatsapp);
}

/** WhatsApp bubble: site administrators. */
export function saveWhatsApp(
  user: User,
  slug: string,
  input: Record<string, unknown>
) {
  const { site } = siteFor(user, slug, "admin");
  const r = validateWhatsApp(input);
  if ("error" in r) throw new HttpError(400, r.error);
  db()
    .prepare("UPDATE sites SET whatsapp = ? WHERE id = ?")
    .run(JSON.stringify(r.value), site.id);
  log(
    site.id,
    user.id,
    "whatsapp",
    r.value.number
      ? "Balão de WhatsApp alterado."
      : "Balão de WhatsApp desligado."
  );
}

/** Tracking IDs and flags: site administrators. */
export function saveTracking(
  user: User,
  slug: string,
  input: Record<string, unknown>
) {
  const { site } = siteFor(user, slug, "admin");
  const r = validateTracking(input);
  if ("error" in r) throw new HttpError(400, r.error);
  db()
    .prepare("UPDATE sites SET tracking = ? WHERE id = ?")
    .run(JSON.stringify(r.value), site.id);
  log(site.id, user.id, "tracking", "Configurações de rastreamento alteradas.");
}

/**
 * Free <head> code (Tag Manager, chat widgets...). Platform admins only: it
 * runs on the site's pages, which share an origin with the dashboard on the
 * provisional address, so it must come from someone fully trusted.
 */
export function saveHeadScript(user: User, slug: string, html: string) {
  if (!user.is_super_admin)
    throw new HttpError(
      403,
      "Só a equipe da agência pode colocar código próprio no site."
    );
  const { site } = siteFor(user, slug, "admin");
  const code = html.trim();
  if (code.length > MAX_HEAD_SCRIPT)
    throw new HttpError(
      400,
      `O código é grande demais (máximo ${MAX_HEAD_SCRIPT} caracteres).`
    );
  db()
    .prepare("UPDATE sites SET head_script = ? WHERE id = ?")
    .run(code, site.id);
  log(
    site.id,
    user.id,
    "tracking",
    code
      ? "Código próprio do site alterado."
      : "Código próprio do site removido."
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/** Count one visit. No cookies, no IP, no personal data: a counter per day, page and source. */
export function recordView(
  slug: string,
  path: string,
  originInput: unknown,
  ownHosts: string[] = []
) {
  const site = db()
    .prepare("SELECT id, tracking FROM sites WHERE slug = ?")
    .get(slug) as Pick<Site, "id" | "tracking"> | undefined;
  if (!site || !parseTracking(site.tracking).views) return false;
  const p = normalizePath(path);
  // Only pages that exist: stops anyone from filling the table with made-up paths.
  if (!getPublished(site.id, p)) return false;
  const source = sourceLabel(sanitizeOrigin(originInput), ownHosts).slice(
    0,
    60
  );
  db()
    .prepare(
      `INSERT INTO page_views (site_id, day, path, source, views) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(site_id, day, path, source) DO UPDATE SET views = views + 1`
    )
    .run(site.id, today(), p, source);
  return true;
}

export function viewSummary(siteId: string, days = 30) {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--)
    list.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  const rows = db()
    .prepare(
      "SELECT day, path, source, views FROM page_views WHERE site_id = ? AND day >= ?"
    )
    .all(siteId, list[0]) as ViewRow[];
  return summarizeViews(rows, list);
}
