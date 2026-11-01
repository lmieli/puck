import { NextResponse } from "next/server";
import { errorResponse, jsonBody } from "@/lib/api";
import { addLead } from "@/lib/repo";

const recent = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    // Light rate limit per IP: 5 submissions per 10 minutes.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const now = Date.now();
    const hits = (recent.get(ip) ?? []).filter((t) => now - t < 600_000);
    if (hits.length >= 5)
      return NextResponse.json(
        { error: "Muitas mensagens. Tente mais tarde." },
        { status: 429 }
      );
    recent.set(ip, [...hits, now]);
    const body = await jsonBody<Record<string, string>>(req);
    addLead(String(body.site || ""), {
      page: String(body.page || "/"),
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      message: String(body.message || ""),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
