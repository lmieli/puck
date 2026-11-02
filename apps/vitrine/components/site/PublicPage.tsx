import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { fillDefaults } from "@/blocks/schema";
import { getTracking, getWhatsApp } from "@/lib/analytics";
import { getPublished, normalizePath, type Site } from "@/lib/repo";
import { SiteRender } from "./SiteRender";
import { Tracking } from "./Tracking";
import { WhatsAppBubble } from "./WhatsAppBubble";

export function publicMetadata(
  site: Site | null,
  parts: string[] | undefined
): Metadata {
  if (!site) return {};
  const data = getPublished(site.id, normalizePath((parts ?? []).join("/")));
  const props = (data?.root.props ?? {}) as {
    title?: string;
    description?: string;
  };
  const t = getTracking(site);
  return {
    title: { absolute: props.title || site.name },
    description: props.description || undefined,
    openGraph: {
      title: props.title || site.name,
      description: props.description || undefined,
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
}: {
  site: Site | null;
  parts: string[] | undefined;
}) {
  if (!site) notFound();
  const path = normalizePath((parts ?? []).join("/"));
  const data = getPublished(site.id, path);
  if (!data) notFound();
  const whatsapp = getWhatsApp(site);
  return (
    <>
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
        bubbleSide={whatsapp.number ? whatsapp.position : null}
      />
      <WhatsAppBubble whatsapp={whatsapp} />
    </>
  );
}
