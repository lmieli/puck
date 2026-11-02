// Pure design data shared by the schema, the renderer, the editor and the AI:
// font catalogue, style presets, embed URL handling and CSS sanitising.

export type FontDef = {
  label: string;
  css: string;
  google?: string;
  serif?: boolean;
};

/** Fonts a page can use. `google` is the css2 `family=` value. */
export const fonts: Record<string, FontDef> = {
  inter: {
    label: "Inter",
    css: '"Inter", sans-serif',
    google: "Inter:wght@400;500;600;700;800",
  },
  manrope: {
    label: "Manrope",
    css: '"Manrope", sans-serif',
    google: "Manrope:wght@500;600;700;800",
  },
  sora: {
    label: "Sora",
    css: '"Sora", sans-serif',
    google: "Sora:wght@400;600;700",
  },
  dmsans: {
    label: "DM Sans",
    css: '"DM Sans", sans-serif',
    google: "DM+Sans:wght@400;500;700",
  },
  jakarta: {
    label: "Plus Jakarta Sans",
    css: '"Plus Jakarta Sans", sans-serif',
    google: "Plus+Jakarta+Sans:wght@400;600;700;800",
  },
  outfit: {
    label: "Outfit",
    css: '"Outfit", sans-serif',
    google: "Outfit:wght@400;600;700",
  },
  space: {
    label: "Space Grotesk",
    css: '"Space Grotesk", sans-serif',
    google: "Space+Grotesk:wght@400;500;700",
  },
  instrument: {
    label: "Instrument Serif",
    css: '"Instrument Serif", Georgia, serif',
    google: "Instrument+Serif:ital@0;1",
    serif: true,
  },
  playfair: {
    label: "Playfair Display",
    css: '"Playfair Display", Georgia, serif',
    google: "Playfair+Display:wght@400;600;700",
    serif: true,
  },
  fraunces: {
    label: "Fraunces",
    css: '"Fraunces", Georgia, serif',
    google: "Fraunces:wght@400;600;700",
    serif: true,
  },
  cormorant: {
    label: "Cormorant Garamond",
    css: '"Cormorant Garamond", Georgia, serif',
    google: "Cormorant+Garamond:wght@400;500;600",
    serif: true,
  },
  dmserif: {
    label: "DM Serif Display",
    css: '"DM Serif Display", Georgia, serif',
    google: "DM+Serif+Display",
    serif: true,
  },
  lora: {
    label: "Lora",
    css: '"Lora", Georgia, serif',
    google: "Lora:wght@400;500;600",
    serif: true,
  },
  mono: {
    label: "JetBrains Mono",
    css: '"JetBrains Mono", ui-monospace, monospace',
    google: "JetBrains+Mono:wght@400;500",
  },
  system: {
    label: "Fonte do sistema",
    css: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  },
};

/** Fonts already loaded by the app shell (no extra request needed). */
export const preloadedFonts = new Set(["inter", "manrope", "instrument"]);

export const fontOptions = Object.entries(fonts).map(([value, f]) => ({
  value,
  label: f.label,
}));

/** Heading and body families of the three built-in presets (`font`). */
export const fontPresets: Record<string, { heading: string; body: string }> = {
  clean: { heading: "inter", body: "inter" },
  editorial: { heading: "instrument", body: "inter" },
  geometric: { heading: "manrope", body: "inter" },
};

export function googleFontsUrl(keys: string[]) {
  const families = Array.from(new Set(keys))
    .filter((k) => fonts[k]?.google && !preloadedFonts.has(k))
    .map((k) => `family=${fonts[k].google}`);
  return families.length
    ? `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`
    : null;
}

/** Style props a preset (or "apply to all pages") may set on the page root. */
export const styleKeys = [
  "theme",
  "accent",
  "font",
  "headingFont",
  "bodyFont",
  "headingWeight",
  "titleScale",
  "radius",
  "buttonShape",
  "contentWidth",
  "density",
  "bgColor",
  "textColor",
  "animations",
] as const;

export type StyleKey = (typeof styleKeys)[number];

const base = {
  theme: "light",
  accent: "#0071e3",
  font: "clean",
  headingFont: "auto",
  bodyFont: "auto",
  headingWeight: "auto",
  titleScale: "md",
  radius: "md",
  buttonShape: "pill",
  contentWidth: "normal",
  density: "normal",
  bgColor: "",
  textColor: "",
  animations: true,
};

export const presets: {
  id: string;
  name: string;
  description: string;
  swatch: [string, string, string];
  props: Record<StyleKey, unknown>;
}[] = [
  {
    id: "apple-claro",
    name: "Claro e limpo",
    description: "Fundo branco, azul de destaque e tipografia neutra.",
    swatch: ["#ffffff", "#1d1d1f", "#0071e3"],
    props: { ...base },
  },
  {
    id: "apple-escuro",
    name: "Escuro cinematográfico",
    description: "Fundo preto, azul brilhante, ideal para produto.",
    swatch: ["#000000", "#f5f5f7", "#2997ff"],
    props: { ...base, theme: "dark", accent: "#2997ff" },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Títulos serifados, cantos discretos e vermelho profundo.",
    swatch: ["#ffffff", "#1d1d1f", "#c8102e"],
    props: {
      ...base,
      font: "editorial",
      accent: "#c8102e",
      radius: "sm",
      buttonShape: "rounded",
      titleScale: "lg",
    },
  },
  {
    id: "ousado",
    name: "Ousado",
    description: "Preto, títulos pesados e cantos bem arredondados.",
    swatch: ["#000000", "#ffffff", "#ff453a"],
    props: {
      ...base,
      theme: "dark",
      accent: "#ff453a",
      font: "geometric",
      headingWeight: "800",
      radius: "lg",
      titleScale: "lg",
    },
  },
  {
    id: "suave",
    name: "Suave e quente",
    description: "Tons de areia, serifa elegante e muito ar.",
    swatch: ["#f7f2ea", "#2a2420", "#b4532a"],
    props: {
      ...base,
      accent: "#b4532a",
      headingFont: "fraunces",
      bodyFont: "dmsans",
      radius: "xl",
      density: "airy",
      bgColor: "#f7f2ea",
      textColor: "#2a2420",
    },
  },
  {
    id: "tech",
    name: "Tech",
    description: "Escuro, violeta, cantos retos e fonte técnica.",
    swatch: ["#0b0b12", "#ececf5", "#7c5cff"],
    props: {
      ...base,
      theme: "dark",
      accent: "#7c5cff",
      headingFont: "space",
      bodyFont: "inter",
      radius: "sm",
      buttonShape: "square",
      bgColor: "#0b0b12",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Embeds                                                               */
/* ------------------------------------------------------------------ */

/** Turn a pasted video/map link into a safe https embed URL, or null. */
export function embedUrl(raw: string | undefined): string | null {
  let u: URL;
  try {
    u = new URL((raw ?? "").trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtu.be")
    return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname.startsWith("/embed/"))
      return `https://www.youtube-nocookie.com${u.pathname}`;
    const id = u.searchParams.get("v");
    return id
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
      : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id)
      ? `https://player.vimeo.com/video/${id}`
      : null;
  }
  if (host === "player.vimeo.com") return u.toString();
  if (host === "loom.com")
    return u.pathname.startsWith("/share/")
      ? `https://www.loom.com/embed/${u.pathname.split("/")[2]}`
      : u.toString();
  if (host === "google.com" || host === "maps.google.com") {
    return u.pathname.startsWith("/maps/embed") ? u.toString() : null;
  }
  if (host === "openstreetmap.org")
    return u.pathname.startsWith("/export/embed") ? u.toString() : null;
  if (
    host === "calendly.com" ||
    host === "spotify.com" ||
    host === "open.spotify.com" ||
    host === "figma.com"
  )
    return u.toString();
  return null;
}

/* ------------------------------------------------------------------ */
/* Custom CSS                                                           */
/* ------------------------------------------------------------------ */

/** Strip anything that could break out of a <style> tag or load code. */
export function sanitizeCss(css: string | undefined) {
  return (css ?? "")
    .slice(0, 20000)
    .replace(/<\/?\s*style/gi, "")
    .replace(/<!--|-->|<\/|<\s*script/gi, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/-moz-binding|behavior\s*:/gi, "");
}
