import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/api";
import { recordView } from "@/lib/analytics";
import { isBot } from "@/lib/tracking";

// Visit counter beacon. Answers 204 even when nothing was counted: the page
// must never learn anything from it.
const recent = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    if (isBot(req.headers.get("user-agent")))
      return new NextResponse(null, { status: 204 });
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const now = Date.now();
    const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
    if (hits.length >= 60) return new NextResponse(null, { status: 204 });
    recent.set(ip, [...hits, now]);
    if (recent.size > 5000) recent.clear();

    const body = await jsonBody<Record<string, unknown>>(req);
    const host = (req.headers.get("host") || "")
      .split(":")[0]
      .replace(/^www\./, "")
      .toLowerCase();
    recordView(
      String(body.site || ""),
      String(body.path || "/"),
      body.origin,
      host ? [host] : []
    );
  } catch {
    // never fail loudly on a beacon
  }
  return new NextResponse(null, { status: 204 });
}
