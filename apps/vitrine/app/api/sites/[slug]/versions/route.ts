import { jsonBody, withUser } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { listVersions, restoreVersion, siteFor } from "@/lib/repo";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  return withUser((user) => {
    const { site } = siteFor(user, slug);
    const path = new URL(req.url).searchParams.get("path") || "/";
    return { versions: listVersions(site.id, path) };
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  return withUser(async (user) => {
    const { id } = await jsonBody<{ id: number }>(req);
    if (!Number.isInteger(id)) throw new HttpError(400, "Versão inválida.");
    return restoreVersion(user, slug, id);
  });
}
