import { PublicPage, publicMetadata } from "@/components/site/PublicPage";
import { getSiteBySlug } from "@/lib/repo";

type Params = { params: Promise<{ slug: string; path?: string[] }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params) {
  const { slug, path } = await params;
  return publicMetadata(getSiteBySlug(slug), path);
}

export default async function Page({ params }: Params) {
  const { slug, path } = await params;
  return <PublicPage site={getSiteBySlug(slug)} parts={path} />;
}
