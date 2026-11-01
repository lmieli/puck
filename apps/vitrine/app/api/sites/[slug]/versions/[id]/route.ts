import { withUser } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { getVersion, siteFor } from "@/lib/repo";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  return withUser((user) => {
    const { site } = siteFor(user, slug);
    const v = getVersion(site.id, Number(id));
    if (!v) throw new HttpError(404, "Versão não encontrada.");
    return { number: v.number, path: v.path, data: JSON.parse(v.data) };
  });
}
