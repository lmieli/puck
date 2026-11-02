import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { fillDefaults } from "@/blocks/schema";
import { getTracking, getWhatsApp } from "@/lib/analytics";
import { getPublished, normalizePath, type Site } from "@/lib/repo";
import {
  absolute,
  buildJsonLd,
  businessName,
  firstImage,
  isNoindex,
  pageUrl,
  rootOf,
  safeJson,
} from "@/lib/seo";
import { markdownPath } from "@/lib/paths";
import {
  getSeo,
  primaryHost,
  publishedPage,
  siteOrigin,
} from "@/lib/seo-server";
import { SiteRender } from "./SiteRender";
import { Tracking } from "./Tracking";
import { resolveBubble } from "@/lib/whatsapp";
import { WhatsAppBubble } from "./WhatsAppBubble";

/**
 * Title, description, canonical address, robots, Open Graph and Twitter card.
 * `host` is the address the visitor used: only the site's main address is
 * indexable, so a site with its own domain does not compete with its
 * provisional address.
 */
export function publicMetadata(
  site: Site | null,
  parts: string[] | undefined,
  host: string | null = null
): Metadata {
  if (!site) return {};
  const path = normalizePath((parts ?? []).join("/"));
  const page = publishedPage(site.id, path);
  const props = page ? rootOf(page.data) : {};
  const seo = getSeo(site);
  const origin = siteOrigin(site);
  const title = props.title || site.name;
  const description = props.description || undefined;
  const indexable =
    seo.indexable && !props.noindex && !!host && host === primaryHost(site);
  const image = page
    ? absolute(origin, props.ogImage || firstImage(page.data))
    : "";
  const url = pageUrl(origin, path);
  const t = getTracking(site);
  return {
    metadataBase: new URL(origin),
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      types: { "text/markdown": `${origin}${markdownPath(path)}` },
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      url,
      siteName: businessName(site, seo),
      locale: "pt_BR",
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    // Ownership tags are not trackers: they need no consent.
    ...(t.googleVerification
      ? { verification: { google: t.googleVerification } }
      : {}),
    ...(t.metaVerification
      ? { other: { "facebook-domain-verification": t.metaVerification } }
      : {}),
  };
}

export function PublicPage({
  site,
  parts,
  host = null,
}: {
  site: Site | null;
  parts: string[] | undefined;
  host?: string | null;
}) {
  if (!site) notFound();
  const path = normalizePath((parts ?? []).join("/"));
  const data = getPublished(site.id, path);
  if (!data) notFound();
  // Per page and per moment (this route renders on every request): the page
  // rule and the service hours decide whether the bubble shows, and with what text.
  const seo = getSeo(site);
  const indexable =
    seo.indexable && !isNoindex(data) && !!host && host === primaryHost(site);
  const published = publishedPage(site.id, path);
  const jsonLd = indexable
    ? buildJsonLd({
        site: { name: site.name },
        seo,
        origin: siteOrigin(site),
        path,
        data,
        modified: published?.modified,
      })
    : null;
  const whatsapp = resolveBubble(getWhatsApp(site), path, new Date());
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }}
        />
      )}
      <SiteRender
        data={data as unknown as Data}
        siteSlug={site.slug}
        path={path}
      />
      <Tracking
        slug={site.slug}
        path={path}
        tracking={getTracking(site)}
        headScript={site.head_script}
        bubbleSide={whatsapp ? whatsapp.position : null}
      />
      {whatsapp && <WhatsAppBubble whatsapp={whatsapp} />}
    </>
  );
}
