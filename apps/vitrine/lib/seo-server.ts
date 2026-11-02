import "server-only";
import { HttpError, type User } from "./auth";
import { db } from "./db";
import { APP_ROOT_DOMAIN, log, siteFor, type Site } from "./repo";
import {
  originFor,
  parseSeo,
  validateSeo,
  type PageLike,
  type PublishedPage,
  type Seo,
} from "./seo";

export const getSeo = (site: Pick<Site, "seo">): Seo => parseSeo(site.seo);

/** SEO settings: site administrators. */
export function saveSeo(
  user: User,
  slug: string,
  input: Record<string, unknown>
) {
  const { site } = siteFor(user, slug, "admin");
  const r = validateSeo(input);
  if ("error" in r) throw new HttpError(400, r.error);
  db()
    .prepare("UPDATE sites SET seo = ? WHERE id = ?")
    .run(JSON.stringify(r.value), site.id);
  log(site.id, user.id, "seo", "Ajustes de SEO e de IAs alterados.");
}

/**
 * The address search engines should treat as the site's own: its first active
 * custom domain, or the provisional address when there is none.
 */
export function primaryHost(site: Pick<Site, "id" | "slug">) {
  const d = db()
    .prepare(
      "SELECT host FROM domains WHERE site_id = ? AND status IN ('active', 'verified') ORDER BY created_at LIMIT 1"
    )
    .get(site.id) as { host: string } | undefined;
  return d?.host ?? `${site.slug}.${APP_ROOT_DOMAIN}`;
}

export const siteOrigin = (site: Pick<Site, "id" | "slug">) =>
  originFor(primaryHost(site));

/** Published pages with the moment each was last published. */
export function publishedPages(siteId: string): PublishedPage[] {
  const rows = db()
    .prepare(
      `SELECT p.path, p.published,
              (SELECT v.created_at FROM versions v
                WHERE v.site_id = p.site_id AND v.path = p.path
                  AND v.number = p.published_version) AS modified,
              p.updated_at
       FROM pages p WHERE p.site_id = ? AND p.published IS NOT NULL`
    )
    .all(siteId) as {
    path: string;
    published: string;
    modified: string | null;
    updated_at: string;
  }[];
  return rows.map((r) => ({
    path: r.path,
    data: JSON.parse(r.published) as PageLike,
    modified: new Date(
      `${(r.modified ?? r.updated_at).replace(" ", "T")}Z`
    ).toISOString(),
  }));
}

/** One published page with its publication date, or null. */
export function publishedPage(siteId: string, path: string) {
  return publishedPages(siteId).find((p) => p.path === path) ?? null;
}
