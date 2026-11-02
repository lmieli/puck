import { siteForHost } from "@/lib/repo";

// Caddy on-demand TLS "ask" endpoint: answers 200 only for hosts that belong
// to a site, so certificates are never issued for arbitrary domains.
export async function GET(req: Request) {
  const domain = new URL(req.url).searchParams.get("domain") || "";
  if (!domain || !siteForHost(domain))
    return new Response("unknown domain", { status: 404 });
  return new Response("ok");
}
