import { jsonBody, withUser } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { applyStyleToAll } from "@/lib/repo";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  return withUser(async (user) => {
    const body = await jsonBody<{
      props?: Record<string, unknown>;
      path?: string;
    }>(req);
    if (!body.props || typeof body.props !== "object")
      throw new HttpError(400, "Envie as configurações de estilo.");
    const pages = applyStyleToAll(
      user,
      slug,
      body.props,
      String(body.path || "/")
    );
    return { pages };
  });
}
