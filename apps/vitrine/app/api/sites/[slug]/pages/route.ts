import { jsonBody, withUser } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { publish, requestReview, saveDraft } from "@/lib/repo";

type Body = {
  action: "draft" | "publish" | "review";
  path: string;
  data: unknown;
  note?: string;
  source?: "manual" | "ai";
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  return withUser(async (user) => {
    const body = await jsonBody<Body>(req);
    if (typeof body.path !== "string")
      throw new HttpError(400, "Informe a página.");
    if (body.action === "draft")
      return saveDraft(user, slug, body.path, body.data);
    if (body.action === "review")
      return requestReview(user, slug, body.path, body.data);
    if (body.action === "publish") {
      const version = publish(
        user,
        slug,
        body.path,
        body.data,
        body.note ?? "",
        body.source === "ai" ? "ai" : "manual"
      );
      return { ok: true, version };
    }
    throw new HttpError(400, "Ação desconhecida.");
  });
}
