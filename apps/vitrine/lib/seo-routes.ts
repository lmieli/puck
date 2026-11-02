import "server-only";
import { siteForHost, type Site } from "./repo";
import {
  buildLlmsFull,
  buildLlmsTxt,
  buildRobots,
  buildSitemap,
  originFor,
  pageToMarkdown,
  pageUrl,
  isNoindex,
} from "./seo";
import { getSeo, primaryHost, publishedPages, siteOrigin } from "./seo-server";

const text = (body: string, type: string) =>
  new Response(body, {
    headers: {
      "content-type": `${type}; charset=utf-8`,
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });

function lookup(rawHost: string): { site: Site; host: string } | null {
  const host = decodeURIComponent(rawHost).toLowerCase();
  const site = siteForHost(host);
  return site ? { site, host } : null;
}

const notFound = () => new Response("Não encontrado", { status: 404 });

/** robots.txt of whichever address the request came in on. */
export function robotsResponse(rawHost: string) {
  const hit = lookup(rawHost);
  if (!hit) return notFound();
  const { site, host } = hit;
  return text(
    buildRobots({
      seo: getSeo(site),
      origin: originFor(host),
      canonicalHost: host === primaryHost(site),
    }),
    "text/plain"
  );
}

/** Files that describe the site (sitemap, llms.txt) always point at the canonical address. */
export function siteFileResponse(
  rawHost: string,
  kind: "sitemap" | "llms" | "llms-full"
) {
  const hit = lookup(rawHost);
  if (!hit) return notFound();
  const { site, host } = hit;
  const seo = getSeo(site);
  if (!seo.indexable || host !== primaryHost(site)) return notFound();
  const origin = siteOrigin(site);
  const pages = publishedPages(site.id);
  if (kind === "sitemap")
    return text(buildSitemap(origin, pages), "application/xml");
  const args = { site: { name: site.name }, seo, origin, pages };
  return text(
    kind === "llms" ? buildLlmsTxt(args) : buildLlmsFull(args),
    "text/plain"
  );
}

/** Markdown version of one page: what AI agents read instead of the HTML. */
export function markdownResponse(rawHost: string, path: string) {
  const hit = lookup(rawHost);
  if (!hit) return notFound();
  const { site } = hit;
  const page = publishedPages(site.id).find((p) => p.path === path);
  if (!page || isNoindex(page.data)) return notFound();
  const res = text(pageToMarkdown(page.data, site.name), "text/markdown");
  // The HTML page is the one to rank: say so, so the .md copy does not compete.
  res.headers.set(
    "link",
    `<${pageUrl(siteOrigin(site), path)}>; rel="canonical"`
  );
  res.headers.set("vary", "Accept");
  return res;
}
