// Page paths. One rule for the whole app (pure, so it also runs on the client
// and in tests): lower case, only letters, digits, "/", "_" and "-".

export function normalizePath(p: string) {
  const clean = ("/" + (p || "").trim())
    .replace(/\/+/g, "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .toLowerCase();
  return clean.length > 1 ? clean.replace(/\/$/, "") : "/";
}

/** Address of the Markdown version of a page. */
export const markdownPath = (path: string) =>
  path === "/" ? "/index.md" : `${path}.md`;

/** The page a /something.md request refers to (or null when it is not one). */
export function pathFromMarkdown(pathname: string): string | null {
  if (!pathname.endsWith(".md")) return null;
  const p = pathname.slice(0, -3);
  return p === "/index" || p === "" ? "/" : normalizePath(p);
}
