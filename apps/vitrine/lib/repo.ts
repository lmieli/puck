import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { resolveCname, resolve4, resolveTxt } from "node:dns/promises";
import { validateRoot, type PageData } from "../ai/page-ops.ts";
import { styleKeys } from "../blocks/design.ts";
import {
  atLeast,
  hashPassword,
  HttpError,
  roleOn,
  type Role,
  type User,
} from "./auth";
import { db, tx } from "./db";
import { appUrl, sendMail } from "./mail";
import { insertSite } from "./seed";
import { buildTemplate, type TemplateId } from "./templates";
import { normalizePath } from "./paths";
import { sanitizeOrigin } from "./tracking";

export type Site = {
  id: string;
  slug: string;
  name: string;
  template: string;
  ai_model: string | null;
  credits: number;
  /** JSON of tracking IDs and flags; read it with getTracking(). */
  tracking: string;
  /** JSON of the WhatsApp bubble; read it with getWhatsApp(). */
  whatsapp: string;
  /** Free <head> code, settable only by platform admins. */
  head_script: string;
  created_at: string;
};
export type PageRow = {
  path: string;
  draft: string;
  published: string | null;
  published_version: number | null;
  review_requested: number;
  updated_at: string;
  updated_by: string | null;
};
export type Version = {
  id: number;
  number: number;
  note: string;
  source: string;
  created_at: string;
  author: string | null;
};

export const APP_ROOT_DOMAIN =
  process.env.VITRINE_ROOT_DOMAIN || "vitrine.localhost";
export const PLATFORM_TARGET =
  process.env.VITRINE_CNAME_TARGET || `sites.${APP_ROOT_DOMAIN}`;

/* ------------------------------- sites ------------------------------- */

export function listSites(user: User) {
  const sql = user.is_super_admin
    ? `SELECT s.*, 'owner' AS role FROM sites s ORDER BY s.created_at DESC`
    : `SELECT s.*, m.role FROM sites s JOIN memberships m ON m.site_id = s.id WHERE m.user_id = ? ORDER BY s.created_at DESC`;
  const rows = (
    user.is_super_admin
      ? db().prepare(sql).all()
      : db().prepare(sql).all(user.id)
  ) as (Site & { role: Role })[];
  return rows.map((s) => {
    const stats = db()
      .prepare(
        `SELECT COUNT(*) AS pages, SUM(review_requested) AS reviews, MAX(updated_at) AS updated FROM pages WHERE site_id = ?`
      )
      .get(s.id) as { pages: number; reviews: number | null; updated: string };
    const leads = db()
      .prepare("SELECT COUNT(*) AS n FROM leads WHERE site_id = ?")
      .get(s.id) as { n: number };
    const home = db()
      .prepare("SELECT published FROM pages WHERE site_id = ? AND path = '/'")
      .get(s.id) as { published: string | null } | undefined;
    let accent = "#0071e3";
    let theme = "light";
    try {
      const props = JSON.parse(home?.published ?? "{}").root?.props ?? {};
      accent = props.accent ?? accent;
      theme = props.theme ?? theme;
    } catch {}
    return {
      ...s,
      ...stats,
      reviews: stats.reviews ?? 0,
      leads: leads.n,
      accent,
      theme,
    };
  });
}

export function getSiteBySlug(slug: string) {
  return (
    (db().prepare("SELECT * FROM sites WHERE slug = ?").get(slug) as
      | Site
      | undefined) ?? null
  );
}

/** Load a site and check the user's role on it, throwing 403/404. */
export function siteFor(user: User, slug: string, min: Role = "editor") {
  const site = getSiteBySlug(slug);
  if (!site) throw new HttpError(404, "Site não encontrado.");
  const role = roleOn(user, site.id);
  if (!atLeast(role, min))
    throw new HttpError(403, "Você não tem permissão para isso neste site.");
  return { site, role: role as Role };
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}

export function createSite(user: User, name: string, template: TemplateId) {
  if (!user.is_super_admin)
    throw new HttpError(403, "Só a equipe da agência cria sites.");
  let slug = slugify(name);
  for (let i = 2; getSiteBySlug(slug); i++) slug = `${slugify(name)}-${i}`;
  tx(() =>
    insertSite(db(), {
      slug,
      name,
      template,
      pages: buildTemplate(template, name),
      authorId: user.id,
    })
  );
  log(
    getSiteBySlug(slug)!.id,
    user.id,
    "site",
    `Site criado a partir do modelo "${template}"`
  );
  return slug;
}

export function deleteSite(user: User, slug: string) {
  const { site } = siteFor(user, slug, "owner");
  db().prepare("DELETE FROM sites WHERE id = ?").run(site.id);
}

/* ------------------------------- pages ------------------------------- */

export { normalizePath };

export function listPages(siteId: string) {
  return db()
    .prepare(
      `SELECT p.path, p.published_version, p.review_requested, p.updated_at, u.name AS updated_by_name,
              (p.published IS NULL OR p.draft != p.published) AS has_changes, p.draft
       FROM pages p LEFT JOIN users u ON u.id = p.updated_by WHERE p.site_id = ? ORDER BY p.path`
    )
    .all(siteId)
    .map((r) => {
      const row = r as Record<string, unknown>;
      let title = "";
      try {
        title = JSON.parse(String(row.draft)).root?.props?.title ?? "";
      } catch {}
      delete row.draft;
      return { ...row, title } as {
        path: string;
        published_version: number | null;
        review_requested: number;
        updated_at: string;
        updated_by_name: string | null;
        has_changes: number;
        title: string;
      };
    });
}

export function getPage(siteId: string, path: string) {
  return (
    (db()
      .prepare("SELECT * FROM pages WHERE site_id = ? AND path = ?")
      .get(siteId, path) as PageRow | undefined) ?? null
  );
}

export function getPublished(siteId: string, path: string): PageData | null {
  const row = db()
    .prepare("SELECT published FROM pages WHERE site_id = ? AND path = ?")
    .get(siteId, path) as { published: string | null } | undefined;
  return row?.published ? JSON.parse(row.published) : null;
}

function assertPageData(data: unknown): asserts data is PageData {
  const d = data as PageData;
  if (
    !d ||
    typeof d !== "object" ||
    !Array.isArray(d.content) ||
    typeof d.root !== "object"
  ) {
    throw new HttpError(400, "Dados da página inválidos.");
  }
  if (JSON.stringify(d).length > 2_000_000)
    throw new HttpError(413, "Página grande demais.");
}

export function saveDraft(
  user: User,
  slug: string,
  path: string,
  data: unknown
) {
  const { site } = siteFor(user, slug, "editor");
  assertPageData(data);
  const res = db()
    .prepare(
      "UPDATE pages SET draft = ?, updated_at = datetime('now'), updated_by = ? WHERE site_id = ? AND path = ?"
    )
    .run(JSON.stringify(data), user.id, site.id, path);
  if (res.changes === 0) throw new HttpError(404, "Página não encontrada.");
}

function nextVersion(siteId: string, path: string) {
  const r = db()
    .prepare(
      "SELECT MAX(number) AS n FROM versions WHERE site_id = ? AND path = ?"
    )
    .get(siteId, path) as {
    n: number | null;
  };
  return (r.n ?? 0) + 1;
}

export function publish(
  user: User,
  slug: string,
  path: string,
  data: unknown,
  note: string,
  source: "manual" | "ai" | "restore" = "manual"
) {
  const { site } = siteFor(user, slug, "admin");
  assertPageData(data);
  const json = JSON.stringify(data);
  return tx(() => {
    const number = nextVersion(site.id, path);
    db()
      .prepare(
        "INSERT INTO versions (site_id, path, number, data, note, source, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(site.id, path, number, json, note.slice(0, 200), source, user.id);
    const res = db()
      .prepare(
        `UPDATE pages SET draft = ?, published = ?, published_version = ?, review_requested = 0, updated_at = datetime('now'), updated_by = ?
         WHERE site_id = ? AND path = ?`
      )
      .run(json, json, number, user.id, site.id, path);
    if (res.changes === 0) throw new HttpError(404, "Página não encontrada.");
    log(
      site.id,
      user.id,
      "publish",
      `Publicou ${path} (versão ${number})${note ? `: ${note}` : ""}`
    );
    return number;
  });
}

export function requestReview(
  user: User,
  slug: string,
  path: string,
  data: unknown
) {
  saveDraft(user, slug, path, data);
  const { site } = siteFor(user, slug, "editor");
  db()
    .prepare(
      "UPDATE pages SET review_requested = 1 WHERE site_id = ? AND path = ?"
    )
    .run(site.id, path);
  log(site.id, user.id, "review", `Pediu revisão de ${path}`);
}

export function listVersions(siteId: string, path: string) {
  return db()
    .prepare(
      `SELECT v.id, v.number, v.note, v.source, v.created_at, u.name AS author FROM versions v
       LEFT JOIN users u ON u.id = v.author_id WHERE v.site_id = ? AND v.path = ? ORDER BY v.number DESC LIMIT 100`
    )
    .all(siteId, path) as Version[];
}

export function getVersion(siteId: string, id: number) {
  return db()
    .prepare("SELECT * FROM versions WHERE site_id = ? AND id = ?")
    .get(siteId, id) as
    | { id: number; number: number; path: string; data: string }
    | undefined;
}

export function restoreVersion(user: User, slug: string, versionId: number) {
  const { site } = siteFor(user, slug, "admin");
  const v = getVersion(site.id, versionId);
  if (!v) throw new HttpError(404, "Versão não encontrada.");
  const number = publish(
    user,
    slug,
    v.path,
    JSON.parse(v.data),
    `Restaurou a versão ${v.number}`,
    "restore"
  );
  return { path: v.path, number };
}

/** Copy the look (theme, colours, fonts, shape…) of one page onto every other page's draft. */
export function applyStyleToAll(
  user: User,
  slug: string,
  props: Record<string, unknown>,
  exceptPath: string
) {
  const { site } = siteFor(user, slug, "admin");
  const picked: Record<string, unknown> = {};
  for (const k of styleKeys) if (k in props) picked[k] = props[k];
  const clean = validateRoot(picked);
  const rows = db()
    .prepare("SELECT path, draft FROM pages WHERE site_id = ? AND path != ?")
    .all(site.id, exceptPath) as {
    path: string;
    draft: string;
  }[];
  tx(() => {
    for (const r of rows) {
      const data = JSON.parse(r.draft) as PageData;
      data.root = { props: { ...(data.root?.props ?? {}), ...clean } };
      db()
        .prepare(
          "UPDATE pages SET draft = ?, updated_at = datetime('now'), updated_by = ? WHERE site_id = ? AND path = ?"
        )
        .run(JSON.stringify(data), user.id, site.id, r.path);
    }
  });
  log(
    site.id,
    user.id,
    "page",
    `Aplicou o estilo de ${exceptPath} a ${rows.length} página(s)`
  );
  return rows.length;
}

export function createPage(
  user: User,
  slug: string,
  rawPath: string,
  title: string,
  copyFrom?: string
) {
  const { site } = siteFor(user, slug, "admin");
  const path = normalizePath(rawPath);
  if (getPage(site.id, path))
    throw new HttpError(409, "Já existe uma página nesse endereço.");
  let data: PageData;
  const source = copyFrom ? getPage(site.id, copyFrom) : getPage(site.id, "/");
  if (source) {
    const base = JSON.parse(source.draft) as PageData;
    const keep = copyFrom
      ? base.content
      : base.content.filter((b) => b.type === "Nav" || b.type === "Footer");
    data = { root: { props: { ...base.root.props, title } }, content: keep };
  } else {
    data = { root: { props: { title } }, content: [] };
  }
  db()
    .prepare(
      "INSERT INTO pages (site_id, path, draft, published, updated_by) VALUES (?, ?, ?, NULL, ?)"
    )
    .run(site.id, path, JSON.stringify(data), user.id);
  log(site.id, user.id, "page", `Criou a página ${path}`);
  return path;
}

export function deletePage(user: User, slug: string, path: string) {
  const { site } = siteFor(user, slug, "admin");
  if (path === "/")
    throw new HttpError(400, "A página inicial não pode ser apagada.");
  db()
    .prepare("DELETE FROM pages WHERE site_id = ? AND path = ?")
    .run(site.id, path);
  log(site.id, user.id, "page", `Apagou a página ${path}`);
}

/* ------------------------------- domains ------------------------------ */

export type Domain = {
  id: string;
  host: string;
  token: string;
  status: string;
  last_check: string | null;
  last_error: string | null;
};

export function listDomains(siteId: string) {
  return db()
    .prepare("SELECT * FROM domains WHERE site_id = ? ORDER BY created_at")
    .all(siteId) as Domain[];
}

export function addDomain(user: User, slug: string, rawHost: string) {
  const { site } = siteFor(user, slug, "admin");
  const host = rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(host))
    throw new HttpError(400, "Domínio inválido.");
  if (db().prepare("SELECT 1 FROM domains WHERE host = ?").get(host))
    throw new HttpError(409, "Esse domínio já está em uso.");
  const token = `vitrine-verify=${randomBytes(12).toString("hex")}`;
  db()
    .prepare(
      "INSERT INTO domains (id, site_id, host, token) VALUES (?, ?, ?, ?)"
    )
    .run(randomUUID(), site.id, host, token);
  log(site.id, user.id, "domain", `Adicionou o domínio ${host}`);
  return host;
}

export function removeDomain(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  const row = db()
    .prepare("SELECT host FROM domains WHERE id = ? AND site_id = ?")
    .get(id, site.id) as { host: string } | undefined;
  db()
    .prepare("DELETE FROM domains WHERE id = ? AND site_id = ?")
    .run(id, site.id);
  return row?.host ?? null;
}

/** Check the TXT ownership record and that the host points at the platform. */
export async function verifyDomain(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  const d = db()
    .prepare("SELECT * FROM domains WHERE id = ? AND site_id = ?")
    .get(id, site.id) as Domain | undefined;
  if (!d) throw new HttpError(404, "Domínio não encontrado.");
  let status = "pending";
  let error: string | null = null;
  try {
    const txt = (
      await resolveTxt(`_vitrine.${d.host}`).catch(() => [] as string[][])
    ).map((r) => r.join(""));
    if (!txt.includes(d.token)) {
      error = `Registro TXT _vitrine.${d.host} não encontrado ou diferente.`;
    } else {
      const cname = await resolveCname(d.host).catch(() => [] as string[]);
      const a = await resolve4(d.host).catch(() => [] as string[]);
      const expectedIp = process.env.VITRINE_PLATFORM_IP;
      const points =
        cname.some((c) => c.replace(/\.$/, "") === PLATFORM_TARGET) ||
        (!!expectedIp && a.includes(expectedIp));
      if (points) status = "active";
      else {
        status = "verified";
        error = `Propriedade confirmada. Falta apontar ${
          d.host
        } para ${PLATFORM_TARGET} (CNAME)${
          expectedIp ? ` ou ${expectedIp} (A)` : ""
        }.`;
      }
    }
  } catch (e) {
    error = (e as Error).message;
  }
  db()
    .prepare(
      "UPDATE domains SET status = ?, last_error = ?, last_check = datetime('now') WHERE id = ?"
    )
    .run(status, error, id);
  return { status, error };
}

/** Resolve which site a request host belongs to. */
export function siteForHost(host: string) {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  const d = db()
    .prepare(
      "SELECT s.* FROM domains d JOIN sites s ON s.id = d.site_id WHERE d.host = ? AND d.status IN ('active', 'verified')"
    )
    .get(h) as Site | undefined;
  if (d) return d;
  const suffix = `.${APP_ROOT_DOMAIN}`;
  if (h.endsWith(suffix)) return getSiteBySlug(h.slice(0, -suffix.length));
  return null;
}

/* ------------------------------- members ------------------------------ */

export function listMembers(siteId: string) {
  return db()
    .prepare(
      "SELECT u.id, u.name, u.email, m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.site_id = ? ORDER BY u.name"
    )
    .all(siteId) as {
    id: string;
    name: string;
    email: string;
    role: "admin" | "editor";
  }[];
}

/* ------------------------------ access links --------------------------- */

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** One-time link that lets a user set a password (invite or reset). */
export function createAccessLink(userId: string, kind: "invite" | "reset") {
  const token = randomBytes(24).toString("base64url");
  const hours = kind === "invite" ? 24 * 7 : 2;
  db()
    .prepare(
      "INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)"
    )
    .run(
      hashToken(token),
      userId,
      kind,
      new Date(Date.now() + hours * 3600e3).toISOString()
    );
  return appUrl(`/acesso/${token}`);
}

export function readAccessLink(token: string) {
  return (
    (db()
      .prepare(
        `SELECT t.token_hash, t.kind, u.id AS user_id, u.email, u.name FROM tokens t JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > ?`
      )
      .get(hashToken(token), new Date().toISOString()) as
      | {
          token_hash: string;
          kind: "invite" | "reset";
          user_id: string;
          email: string;
          name: string;
        }
      | undefined) ?? null
  );
}

export function redeemAccessLink(token: string, password: string) {
  if (password.length < 8)
    throw new HttpError(400, "A senha precisa ter pelo menos 8 caracteres.");
  const link = readAccessLink(token);
  if (!link)
    throw new HttpError(
      410,
      "Este link expirou ou já foi usado. Peça um novo."
    );
  tx(() => {
    db()
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(hashPassword(password), link.user_id);
    db()
      .prepare(
        "UPDATE tokens SET used_at = datetime('now') WHERE token_hash = ?"
      )
      .run(link.token_hash);
  });
  return link.user_id;
}

/** Self-service reset: e-mails a link when e-mail is configured. Never reveals whether the account exists. */
export async function requestPasswordReset(email: string) {
  const user = db()
    .prepare("SELECT id, name FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as
    | { id: string; name: string }
    | undefined;
  if (!user) return;
  const link = createAccessLink(user.id, "reset");
  await sendMail(
    email,
    "Redefinir sua senha na Vitrine",
    `Olá, ${user.name}.\n\nPara criar uma nova senha, abra o link abaixo (vale por 2 horas):\n${link}\n\nSe você não pediu, ignore este e-mail.`
  );
}

export async function addMember(
  user: User,
  slug: string,
  email: string,
  name: string,
  role: "admin" | "editor"
) {
  const { site } = siteFor(user, slug, "admin");
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail))
    throw new HttpError(400, "E-mail inválido.");
  let target = db()
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(cleanEmail) as { id: string } | undefined;
  let link: string | null = null;
  if (!target) {
    const id = randomUUID();
    // "!" is never a valid hash: the account has no password until the invite is used.
    db()
      .prepare(
        "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, '!')"
      )
      .run(id, cleanEmail, name.trim() || cleanEmail);
    target = { id };
    link = createAccessLink(id, "invite");
  }
  db()
    .prepare(
      "INSERT INTO memberships (user_id, site_id, role) VALUES (?, ?, ?) ON CONFLICT(user_id, site_id) DO UPDATE SET role = excluded.role"
    )
    .run(target.id, site.id, role);
  log(site.id, user.id, "member", `Deu acesso de ${role} a ${cleanEmail}`);
  const emailed = link
    ? await sendMail(
        cleanEmail,
        `Seu acesso ao site ${site.name}`,
        `Olá!\n\n${user.name} deu a você acesso ao site ${site.name} na Vitrine.\nCrie sua senha neste link (vale por 7 dias):\n${link}`
      )
    : false;
  return { link, emailed };
}

/** Admin-generated sign-in link for a member who lost their password. */
export function memberAccessLink(user: User, slug: string, memberId: string) {
  const { site } = siteFor(user, slug, "admin");
  const m = db()
    .prepare("SELECT 1 FROM memberships WHERE site_id = ? AND user_id = ?")
    .get(site.id, memberId);
  if (!m) throw new HttpError(404, "Pessoa não encontrada neste site.");
  return createAccessLink(memberId, "reset");
}

export function removeMember(user: User, slug: string, userId: string) {
  const { site } = siteFor(user, slug, "admin");
  db()
    .prepare("DELETE FROM memberships WHERE site_id = ? AND user_id = ?")
    .run(site.id, userId);
}

/* -------------------------------- leads ------------------------------- */

export function addLead(
  siteSlug: string,
  input: {
    page: string;
    name: string;
    email: string;
    phone?: string;
    message?: string;
    origin?: unknown;
  }
) {
  const site = getSiteBySlug(siteSlug);
  if (!site) throw new HttpError(404, "Site não encontrado.");
  const name = input.name?.trim().slice(0, 120);
  const email = input.email?.trim().slice(0, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || ""))
    throw new HttpError(400, "Informe nome e e-mail válidos.");
  db()
    .prepare(
      "INSERT INTO leads (id, site_id, page, name, email, phone, message, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      randomUUID(),
      site.id,
      input.page.slice(0, 200),
      name,
      email,
      (input.phone || "").slice(0, 40),
      (input.message || "").slice(0, 4000),
      JSON.stringify(sanitizeOrigin(input.origin))
    );
}

export function listLeads(siteId: string) {
  return db()
    .prepare(
      "SELECT * FROM leads WHERE site_id = ? ORDER BY created_at DESC LIMIT 500"
    )
    .all(siteId) as {
    id: string;
    page: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    origin: string;
    created_at: string;
  }[];
}

/* ------------------------------- activity ----------------------------- */

export function log(
  siteId: string,
  userId: string | null,
  kind: string,
  detail: string
) {
  db()
    .prepare(
      "INSERT INTO activity (site_id, user_id, kind, detail) VALUES (?, ?, ?, ?)"
    )
    .run(siteId, userId, kind, detail);
}

export function listActivity(siteId: string, limit = 30) {
  return db()
    .prepare(
      `SELECT a.kind, a.detail, a.created_at, u.name AS who FROM activity a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.site_id = ? ORDER BY a.id DESC LIMIT ?`
    )
    .all(siteId, limit) as {
    kind: string;
    detail: string;
    created_at: string;
    who: string | null;
  }[];
}
