import { errorResponse } from "@/lib/api";
import { currentUser, HttpError } from "@/lib/auth";
import { listLeads, siteFor } from "@/lib/repo";
import { leadsToCsv } from "@/lib/signup";

const CLASSIC_PARAM = "__classic";

/** Leads as a spreadsheet. Site administrators only: it is the whole list, with personal data. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Faça login para continuar.");
    const { slug } = await ctx.params;
    const { site } = siteFor(user, slug, "admin");
    const url = new URL(req.url);
    const sep = url.searchParams.get("sep") === "," ? "," : ";";
    const formParam = url.searchParams.get("form");
    const form =
      formParam === null ? null : formParam === CLASSIC_PARAM ? "" : formParam;
    const csv = leadsToCsv(listLeads(site.id, form, 10_000), sep);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="contatos-${site.slug}-${day}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
