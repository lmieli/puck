import { siteFileResponse } from "@/lib/seo-routes";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ host: string }> }
) {
  const { host } = await params;
  return siteFileResponse(host, "sitemap");
}
