import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { clientIp, submitLead } from "@/lib/leads";

const MAX_BODY = 30_000;

/**
 * Receives a form submission from a published site. Everything that matters
 * (the form definition, limits, validation, duplicates) is decided in
 * lib/leads.ts; this only reads the request, within a size limit.
 */
export async function POST(req: Request) {
  try {
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY) throw new HttpError(413, "Envio grande demais.");
    const raw = await req.text();
    if (raw.length > MAX_BODY) throw new HttpError(413, "Envio grande demais.");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Corpo da requisição inválido.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new HttpError(400, "Corpo da requisição inválido.");

    // The classic contact form sends name/email/phone/message at the top level;
    // the "Cadastro" block sends its answers under "values".
    const values =
      body.values &&
      typeof body.values === "object" &&
      !Array.isArray(body.values)
        ? body.values
        : {
            name: body.name,
            email: body.email,
            phone: body.phone,
            message: body.message,
          };

    const result = submitLead({
      slug: String(body.site || ""),
      path: String(body.page || "/"),
      blockId: body.blockId ? String(body.blockId) : undefined,
      values,
      consent: body.consent,
      hp: body.hp,
      elapsedMs: body.elapsedMs,
      origin: body.origin,
      ip: clientIp(req),
    });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
