import { NextResponse, type NextRequest } from "next/server";
import { normalizePath, pathFromMarkdown } from "./lib/paths";

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
  // /modelos/ = imagens fixas dos sites de modelo (public/modelos), iguais em
  // qualquer domínio.
  if (
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/media/") ||
    pathname.startsWith("/modelos/")
  )
    return NextResponse.next();
  // AI agents read Markdown: /page.md, or the page address with
  // "Accept: text/markdown" (browsers always ask for text/html too).
  const accept = req.headers.get("accept") || "";
  const wantsMarkdown =
    /text\/markdown/i.test(accept) &&
    !/text\/html/i.test(accept) &&
    !/\.[a-z0-9]+$/i.test(pathname);
  const md = pathname.endsWith(".md") ? pathFromMarkdown(pathname) : null;
  if (md !== null || wantsMarkdown) {
    const target = req.nextUrl.clone();
    const p = md ?? normalizePath(pathname);
    target.pathname = `/md/${encodeURIComponent(host)}${p === "/" ? "" : p}`;
    return NextResponse.rewrite(target);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/domain/${encodeURIComponent(host)}${
    pathname === "/" ? "" : pathname
  }`;
  const res = NextResponse.rewrite(url);
  res.headers.set("vary", "Accept");
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
