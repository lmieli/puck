import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { fillDefaults } from "@/blocks/schema";
import { getPublished, normalizePath, type Site } from "@/lib/repo";
import { SiteRender } from "./SiteRender";

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
  return {
    title: { absolute: props.title || site.name },
    description: props.description || undefined,
    openGraph: {
      title: props.title || site.name,
      description: props.description || undefined,
    },
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
  return (
    <SiteRender
      data={data as unknown as Data}
      siteSlug={site.slug}
      path={path}
    />
  );
}
