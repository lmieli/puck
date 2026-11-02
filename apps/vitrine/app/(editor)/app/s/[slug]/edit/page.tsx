import "@puckeditor/core/puck.css";
import "../../../../editor.css";
import type { Data } from "@puckeditor/core";
import { notFound, redirect } from "next/navigation";
import { aiConfigured } from "@/ai/agent";
import { Editor } from "@/components/editor/Editor";
import { HttpError, requireUser } from "@/lib/auth";
import { fillDefaults } from "@/blocks/schema";
import { getPage, listPages, normalizePath, siteFor } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ path?: string; brief?: string }>;
};

export async function generateMetadata({ params }: Params) {
  return { title: `Editor · ${(await params).slug}` };
}

export default async function EditPage({ params, searchParams }: Params) {
  const user = await requireUser();
  const { slug } = await params;
  const sp = await searchParams;
  let ctx;
  try {
    ctx = siteFor(user, slug);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    redirect("/app");
  }
  const { site, role } = ctx;
  const path = normalizePath(sp.path ?? "/");
  const page = getPage(site.id, path);
  if (!page) notFound();
  const pages = listPages(site.id).map((p) => p.path);

  return (
    <Editor
      site={{ slug: site.slug, name: site.name }}
      path={path}
      pages={pages}
      role={role}
      data={fillDefaults(JSON.parse(page.draft)) as Data}
      aiEnabled={aiConfigured()}
      initialPrompt={sp.brief}
      liveUrl={`/sites/${site.slug}${path === "/" ? "" : path}`}
    />
  );
}
