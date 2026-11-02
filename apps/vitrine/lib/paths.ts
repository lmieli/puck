// Page paths. One rule for the whole app (pure, so it also runs on the client
// and in tests): lower case, only letters, digits, "/", "_" and "-".

export function normalizePath(p: string) {
  const clean = ("/" + (p || "").trim())
    .replace(/\/+/g, "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .toLowerCase();
  return clean.length > 1 ? clean.replace(/\/$/, "") : "/";
}
