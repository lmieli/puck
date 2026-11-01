import { NextResponse, type NextRequest } from "next/server";

// Requests on the platform's own hosts reach the dashboard. Any other host is
// a customer domain (or <slug>.<root domain>) and is rewritten to /domain/<host>,
// where the page looks the host up and renders that customer's site.
const APP_HOSTS = (process.env.VITRINE_APP_HOSTS || "localhost,127.0.0.1")
  .split(",")
  .map((h) => h.trim());
const ROOT = process.env.VITRINE_ROOT_DOMAIN || "vitrine.localhost";

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;
  const isApp =
    !host ||
    APP_HOSTS.includes(host) ||
    host === ROOT ||
    host === `app.${ROOT}`;
  if (isApp) return NextResponse.next();
  if (pathname.startsWith("/api/public") || pathname.startsWith("/media/"))
    return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/domain/${encodeURIComponent(host)}${
    pathname === "/" ? "" : pathname
  }`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
