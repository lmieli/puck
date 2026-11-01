import { PublicPage, publicMetadata } from "@/components/site/PublicPage";
import { siteForHost } from "@/lib/repo";

type Params = { params: Promise<{ host: string; path?: string[] }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params) {
  const { host, path } = await params;
  return publicMetadata(siteForHost(decodeURIComponent(host)), path);
}

export default async function Page({ params }: Params) {
  const { host, path } = await params;
  return (
    <PublicPage site={siteForHost(decodeURIComponent(host))} parts={path} />
  );
}
