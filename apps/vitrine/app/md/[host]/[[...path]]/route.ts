import { markdownResponse } from "@/lib/seo-routes";
import { normalizePath } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ host: string; path?: string[] }> }
) {
  const { host, path } = await params;
  return markdownResponse(host, normalizePath((path ?? []).join("/")));
}
