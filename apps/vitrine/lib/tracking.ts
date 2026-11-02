// Tracking pixels by ID. The client pastes only a number (Meta Pixel ID,
// Google Analytics ID...), never code: each ID is checked against the format
// of its platform and slotted into the official snippet that lives HERE, so
// the code that runs on a site is always ours. Pure module (no database, no
// DOM), so every rule is unit-tested.

export type Tracking = {
  metaPixel: string;
  ga4: string;
  googleAds: string;
  googleAdsLeadLabel: string;
  /** Own conversion for WhatsApp clicks, separate from the form's so neither counts twice. */
  googleAdsWhatsappLabel: string;
  tiktok: string;
  pinterest: string;
  googleVerification: string;
  metaVerification: string;
  /** Ask for cookie consent (LGPD) before loading any tracker. */
  consent: boolean;
  /** Count visits in the dashboard (no cookies, no personal data). */
  views: boolean;
};

export const EMPTY_TRACKING: Tracking = {
  metaPixel: "",
  ga4: "",
  googleAds: "",
  googleAdsLeadLabel: "",
  googleAdsWhatsappLabel: "",
  tiktok: "",
  pinterest: "",
  googleVerification: "",
  metaVerification: "",
  consent: true,
  views: true,
};

type IdField = Exclude<keyof Tracking, "consent" | "views">;

export const ID_RULES: Record<
  IdField,
  {
    label: string;
    example: string;
    re: RegExp;
    upper?: boolean;
  }
> = {
  metaPixel: {
    label: "Meta Pixel (Facebook e Instagram)",
    example: "123456789012345",
    re: /^\d{8,20}$/,
  },
  ga4: {
    label: "Google Analytics 4",
    example: "G-ABC123XYZ9",
    re: /^G-[A-Z0-9]{6,14}$/,
    upper: true,
  },
  googleAds: {
    label: "Google Ads",
    example: "AW-123456789",
    re: /^AW-\d{6,14}$/,
    upper: true,
  },
  googleAdsLeadLabel: {
    label: "Rótulo da conversão do Google Ads",
    example: "AbC-dEfGhIjKlMnOp",
    re: /^[A-Za-z0-9_-]{6,40}$/,
  },
  googleAdsWhatsappLabel: {
    label: "Rótulo da conversão de cliques no WhatsApp",
    example: "ZxY-wVuTsRqPoNm",
    re: /^[A-Za-z0-9_-]{6,40}$/,
  },
  tiktok: {
    label: "TikTok Pixel",
    example: "C1A2B3C4D5E6F7G8H9I0",
    re: /^[A-Z0-9]{10,30}$/,
    upper: true,
  },
  pinterest: {
    label: "Pinterest Tag",
    example: "2612345678901",
    re: /^\d{10,20}$/,
  },
  googleVerification: {
    label: "Verificação do Google Search Console",
    example: "o código do meta tag, sem as aspas",
    re: /^[A-Za-z0-9_-]{20,100}$/,
  },
  metaVerification: {
    label: "Verificação de domínio do Meta",
    example: "o código do meta tag, sem as aspas",
    re: /^[a-z0-9]{20,50}$/,
  },
};

const ID_FIELDS = Object.keys(ID_RULES) as IdField[];

/** Check and normalise what a person typed. IDs are all-or-nothing: one bad value rejects the save. */
export function validateTracking(
  input: Record<string, unknown>
): { value: Tracking } | { error: string } {
  const value: Tracking = { ...EMPTY_TRACKING };
  for (const field of ID_FIELDS) {
    const rule = ID_RULES[field];
    let v = String(input[field] ?? "").trim();
    if (rule.upper) v = v.toUpperCase();
    if (v && !rule.re.test(v))
      return {
        error: `${rule.label}: formato inválido. Cole só o ID, por exemplo ${rule.example}.`,
      };
    value[field] = v;
  }
  if (
    (value.googleAdsLeadLabel || value.googleAdsWhatsappLabel) &&
    !value.googleAds
  )
    return {
      error:
        "Os rótulos de conversão do Google Ads só funcionam junto com o ID do Google Ads.",
    };
  if (
    value.googleAdsLeadLabel &&
    value.googleAdsLeadLabel === value.googleAdsWhatsappLabel
  )
    return {
      error:
        "Use um rótulo diferente para o WhatsApp: com o mesmo rótulo do formulário, cada contato contaria em dobro.",
    };
  value.consent = input.consent === "on" || input.consent === true;
  value.views = input.views === "on" || input.views === true;
  return { value };
}

/** Read what is stored, dropping anything that no longer passes validation. */
export function parseTracking(raw: string | null | undefined): Tracking {
  let obj: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object") obj = parsed;
  } catch {
    // corrupt value: behave as if nothing was configured
  }
  const out: Tracking = { ...EMPTY_TRACKING };
  for (const field of ID_FIELDS) {
    const v = String(obj[field] ?? "");
    if (ID_RULES[field].re.test(v)) out[field] = v;
  }
  if (typeof obj.consent === "boolean") out.consent = obj.consent;
  if (typeof obj.views === "boolean") out.views = obj.views;
  return out;
}

/** Does this site load any third-party code (and so need consent)? */
export function hasTrackers(t: Tracking, headScript = "") {
  return Boolean(
    t.metaPixel ||
      t.ga4 ||
      t.googleAds ||
      t.tiktok ||
      t.pinterest ||
      headScript.trim()
  );
}

/* ------------------------------------------------------------------ */
/* Official snippets                                                     */
/* ------------------------------------------------------------------ */

export type Vendor = {
  name: string;
  /** Inline code, run first. IDs go in through JSON.stringify. */
  code: string;
  /** External library, appended after the inline code. */
  src?: string;
};

const q = (s: string) => JSON.stringify(s);

/** The code each configured platform needs. Empty when nothing is configured. */
export function vendorScripts(t: Tracking): Vendor[] {
  const out: Vendor[] = [];

  if (t.metaPixel)
    out.push({
      name: "meta",
      code:
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
        `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
        `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
        `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
        `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
        `fbq('init',${q(t.metaPixel)});fbq('track','PageView');`,
    });

  const gtagIds = [t.ga4, t.googleAds].filter(Boolean);
  if (gtagIds.length)
    out.push({
      name: "google",
      src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        gtagIds[0]
      )}`,
      code:
        `window.dataLayer=window.dataLayer||[];` +
        `function gtag(){dataLayer.push(arguments)}window.gtag=gtag;` +
        `gtag('js',new Date());` +
        gtagIds.map((id) => `gtag('config',${q(id)});`).join(""),
    });

  if (t.tiktok)
    out.push({
      name: "tiktok",
      code:
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];` +
        `ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],` +
        `ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};` +
        `for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);` +
        `ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},` +
        `ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";` +
        `ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};` +
        `n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;` +
        `e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};` +
        `ttq.load(${q(t.tiktok)});ttq.page()}(window,document,'ttq');`,
    });

  if (t.pinterest)
    out.push({
      name: "pinterest",
      code:
        `!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};` +
        `var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;` +
        `var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");` +
        `pintrk('load',${q(t.pinterest)});pintrk('page');`,
    });

  return out;
}

/* ------------------------------------------------------------------ */
/* Events                                                                */
/* ------------------------------------------------------------------ */

export type TrackEvent = "lead" | "cta" | "whatsapp";

/**
 * The calls each platform gets for an event: [global function, arguments].
 * "lead" is a contact form sent, "whatsapp" a click on the WhatsApp bubble
 * (Meta's standard Contact event), "cta" a click on a main button.
 */
export function eventCalls(
  t: Tracking,
  event: TrackEvent,
  label = ""
): [string, unknown[]][] {
  const calls: [string, unknown[]][] = [];
  const l = label.slice(0, 60);
  if (t.metaPixel)
    calls.push([
      "fbq",
      event === "lead"
        ? ["track", "Lead"]
        : event === "whatsapp"
        ? ["track", "Contact"]
        : ["trackCustom", "CTAClick", { label: l }],
    ]);
  if (t.ga4 || t.googleAds) {
    calls.push([
      "gtag",
      event === "lead"
        ? ["event", "generate_lead"]
        : event === "whatsapp"
        ? ["event", "whatsapp_click"]
        : ["event", "cta_click", { label: l }],
    ]);
    const label =
      event === "lead"
        ? t.googleAdsLeadLabel
        : event === "whatsapp"
        ? t.googleAdsWhatsappLabel
        : "";
    if (t.googleAds && label)
      calls.push([
        "gtag",
        ["event", "conversion", { send_to: `${t.googleAds}/${label}` }],
      ]);
  }
  if (t.tiktok)
    calls.push([
      "ttq.track",
      [
        event === "lead"
          ? "SubmitForm"
          : event === "whatsapp"
          ? "Contact"
          : "ClickButton",
      ],
    ]);
  if (t.pinterest)
    calls.push([
      "pintrk",
      event === "lead"
        ? ["track", "lead"]
        : ["track", "custom", { label: event === "whatsapp" ? "whatsapp" : l }],
    ]);
  return calls;
}

/* ------------------------------------------------------------------ */
/* Where visitors come from                                              */
/* ------------------------------------------------------------------ */

const ORIGIN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ttclid",
  "referrer",
  "landing",
] as const;

export type Origin = Partial<Record<(typeof ORIGIN_KEYS)[number], string>>;

/** Keep only known keys, as short strings: this comes straight from a visitor. */
export function sanitizeOrigin(input: unknown): Origin {
  const out: Origin = {};
  if (!input || typeof input !== "object") return out;
  for (const k of ORIGIN_KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim())
      out[k] = v
        .replace(/[\u0000-\u001f]/g, "")
        .trim()
        .slice(0, 200);
  }
  return out;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Short human label: "google / cpc", "instagram.com" or "direto". */
export function sourceLabel(o: Origin, ownHosts: string[] = []): string {
  if (o.utm_source)
    return o.utm_medium ? `${o.utm_source} / ${o.utm_medium}` : o.utm_source;
  if (o.gclid) return "google / cpc";
  if (o.fbclid) return "facebook / social";
  if (o.ttclid) return "tiktok / social";
  const host = o.referrer ? hostOf(o.referrer) : "";
  if (host && !ownHosts.includes(host)) return host;
  return "direto";
}

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python-requests|facebookexternalhit/i;

/** Crawlers and monitors would inflate the visit count. */
export function isBot(userAgent: string | null | undefined) {
  return !userAgent || BOT.test(userAgent);
}

/* ------------------------------------------------------------------ */
/* Visit summary                                                         */
/* ------------------------------------------------------------------ */

export type ViewRow = {
  day: string;
  path: string;
  source: string;
  views: number;
};

/** Days filled with zeros, top pages and top sources from raw rows. */
export function summarizeViews(rows: ViewRow[], days: string[]) {
  const perDay = new Map<string, number>(days.map((d) => [d, 0]));
  const pages = new Map<string, number>();
  const sources = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (!perDay.has(r.day)) continue;
    perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.views);
    pages.set(r.path, (pages.get(r.path) ?? 0) + r.views);
    sources.set(r.source, (sources.get(r.source) ?? 0) + r.views);
    total += r.views;
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n)
      .map(([name, views]) => ({ name, views }));
  return {
    total,
    perDay: days.map((day) => ({ day, views: perDay.get(day) ?? 0 })),
    pages: top(pages, 8),
    sources: top(sources, 8),
  };
}

/* ------------------------------------------------------------------ */
/* Own event counters (WhatsApp clicks)                                  */
/* ------------------------------------------------------------------ */

export const EVENT_KINDS = ["whatsapp"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type EventRow = {
  day: string;
  path: string;
  source: string;
  count: number;
};

/** Total, top sources and top pages of one kind of event inside the day window. */
export function summarizeEvents(rows: EventRow[], days: string[]) {
  const inWindow = new Set(days);
  const sources = new Map<string, number>();
  const pages = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (!inWindow.has(r.day)) continue;
    total += r.count;
    sources.set(r.source, (sources.get(r.source) ?? 0) + r.count);
    pages.set(r.path, (pages.get(r.path) ?? 0) + r.count);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));
  return { total, sources: top(sources, 8), pages: top(pages, 8) };
}
