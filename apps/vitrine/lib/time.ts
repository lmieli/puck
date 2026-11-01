/** Relative time in Portuguese ("há 5 min"). SQLite datetimes are UTC without a zone. */
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
