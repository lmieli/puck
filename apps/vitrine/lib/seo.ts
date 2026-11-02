// SEO for search engines and for AI agents (ChatGPT, Claude, Perplexity…).
// Pure module (no database, no DOM) so it runs on the server and in tests.
//
// What a site gets, with no work from the client:
//  - robots.txt with a clear policy for search engines and for each AI crawler;
//  - sitemap.xml with the published, indexable pages;
//  - llms.txt and llms-full.txt, a plain map and the full text of the site
//    for language models;
//  - a Markdown version of every page (/page.md, or Accept: text/markdown),
//    which agents read with far fewer tokens than the HTML;
//  - canonical URLs, Open Graph / Twitter cards and JSON-LD (Organization or
//    LocalBusiness, WebSite, WebPage, BreadcrumbList, FAQPage);
//  - an audit that tells the client what to fix on each page.

import { fieldsFor, type BlockName, type FieldDef } from "../blocks/schema.ts";
import { markdownPath, normalizePath } from "./paths.ts";

/* ------------------------------------------------------------------ */
/* AI crawlers                                                          */
/* ------------------------------------------------------------------ */

export type AiBot = { agent: string; vendor: string; what: string };

/**
 * Crawlers that fetch pages so the site can appear in AI answers and search
 * (ChatGPT search, Claude and Perplexity answers, and pages a person asks the
 * assistant to open). Blocking them removes the site from those answers.
 */
export const AI_SEARCH_BOTS: AiBot[] = [
  { agent: "OAI-SearchBot", vendor: "OpenAI", what: "busca do ChatGPT" },
  {
    agent: "ChatGPT-User",
    vendor: "OpenAI",
    what: "páginas que uma pessoa pede ao ChatGPT para abrir",
  },
  { agent: "Claude-SearchBot", vendor: "Anthropic", what: "busca do Claude" },
  {
    agent: "Claude-User",
    vendor: "Anthropic",
    what: "páginas que uma pessoa pede ao Claude para abrir",
  },
  {
    agent: "PerplexityBot",
    vendor: "Perplexity",
    what: "índice de respostas do Perplexity",
  },
  {
    agent: "Perplexity-User",
    vendor: "Perplexity",
    what: "páginas que uma pessoa pede ao Perplexity para abrir",
  },
];

/** Crawlers that collect content to train models. Blocking them does not remove the site from AI answers. */
export const AI_TRAINING_BOTS: AiBot[] = [
  { agent: "GPTBot", vendor: "OpenAI", what: "treino dos modelos da OpenAI" },
  {
    agent: "ClaudeBot",
    vendor: "Anthropic",
    what: "treino dos modelos do Claude",
  },
  {
    agent: "anthropic-ai",
    vendor: "Anthropic",
    what: "rastreador antigo da Anthropic",
  },
  {
    agent: "Google-Extended",
    vendor: "Google",
    what: "treino do Gemini (não afeta a busca do Google)",
  },
  {
    agent: "Applebot-Extended",
    vendor: "Apple",
    what: "treino da Apple Intelligence",
  },
  {
    agent: "CCBot",
    vendor: "Common Crawl",
    what: "acervo público usado para treinar modelos",
  },
  {
    agent: "Meta-ExternalAgent",
    vendor: "Meta",
    what: "treino dos modelos da Meta",
  },
  {
    agent: "Bytespider",
    vendor: "ByteDance",
    what: "treino dos modelos da ByteDance",
  },
  {
    agent: "Amazonbot",
    vendor: "Amazon",
    what: "treino e respostas da Amazon",
  },
  {
    agent: "cohere-ai",
    vendor: "Cohere",
    what: "treino dos modelos da Cohere",
  },
];

/* ------------------------------------------------------------------ */
/* Per-site settings                                                    */
/* ------------------------------------------------------------------ */

export const BUSINESS_TYPES: [string, string][] = [
  ["Organization", "Empresa ou organização"],
  ["LocalBusiness", "Negócio local"],
  ["ProfessionalService", "Serviço profissional"],
  ["HomeAndConstructionBusiness", "Construção, reforma ou engenharia"],
  ["RealEstateAgent", "Imobiliária"],
  ["Store", "Loja"],
  ["Restaurant", "Restaurante"],
  ["MedicalBusiness", "Saúde"],
  ["LegalService", "Advocacia"],
  ["EducationalOrganization", "Escola ou curso"],
  ["Person", "Pessoa (profissional autônomo)"],
];

export type Seo = {
  /** false = the whole site asks not to be indexed (e.g. while it is being built). */
  indexable: boolean;
  /** Let AI search and answer crawlers read the site. */
  aiSearch: boolean;
  /** Let AI training crawlers collect the site. */
  aiTraining: boolean;
  businessName: string;
  businessType: string;
  /** Short text about the business, written for people and for AI. Goes into llms.txt and JSON-LD. */
  about: string;
  logo: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  /** Where the business appears elsewhere (Instagram, LinkedIn, Google Maps…). */
  sameAs: string[];
  /** Regions served, free text ("Grande São Paulo"). */
  areaServed: string;
};

export const EMPTY_SEO: Seo = {
  indexable: true,
  aiSearch: true,
  aiTraining: true,
  businessName: "",
  businessType: "Organization",
  about: "",
  logo: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  region: "",
  postalCode: "",
  country: "BR",
  sameAs: [],
  areaServed: "",
};

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

const isHttp = (v: string) => /^https?:\/\/[^\s]+$/i.test(v);
const urlOrPath = (v: unknown) => {
  const s = str(v, 500);
  return isHttp(s) || s.startsWith("/") ? s : "";
};
const flag = (v: unknown, fallback: boolean) =>
  v === undefined || v === null || v === ""
    ? fallback
    : v === true || v === "on" || v === "true" || v === "1";

export function parseSeo(raw: string | null | undefined): Seo {
  try {
    const r = validateSeo(JSON.parse(raw || "{}"));
    return "error" in r ? EMPTY_SEO : r.value;
  } catch {
    return EMPTY_SEO;
  }
}

/** Clean and check what the form sends. Unknown keys are dropped. */
export function validateSeo(
  input: Record<string, unknown>
): { value: Seo } | { error: string } {
  const sameAs = (
    Array.isArray(input.sameAs)
      ? input.sameAs
      : String(input.sameAs ?? "").split(/\r?\n/)
  )
    .map((s) => str(s, 300))
    .filter(Boolean);
  for (const s of sameAs)
    if (!isHttp(s))
      return {
        error: `"${s}" não é um endereço válido (comece com https://).`,
      };
  if (sameAs.length > 12)
    return { error: "Use no máximo 12 endereços em redes e perfis." };

  const type = str(input.businessType, 60) || "Organization";
  if (!BUSINESS_TYPES.some(([v]) => v === type))
    return { error: "Tipo de negócio inválido." };

  const email = str(input.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "E-mail inválido." };

  const logo = urlOrPath(input.logo);
  if (str(input.logo, 500) && !logo)
    return {
      error: "O logo precisa ser uma imagem enviada ou um endereço https://.",
    };

  return {
    value: {
      indexable: flag(input.indexable, true),
      aiSearch: flag(input.aiSearch, true),
      aiTraining: flag(input.aiTraining, true),
      businessName: str(input.businessName, 120),
      businessType: type,
      about: str(input.about, 600),
      logo,
      phone: str(input.phone, 40),
      email,
      street: str(input.street, 160),
      city: str(input.city, 80),
      region: str(input.region, 80),
      postalCode: str(input.postalCode, 20),
      country: (str(input.country, 2) || "BR").toUpperCase(),
      sameAs,
      areaServed: str(input.areaServed, 160),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Addresses                                                            */
/* ------------------------------------------------------------------ */

export function originFor(host: string) {
  const local =
    /^(localhost|127\.0\.0\.1)$/.test(host) || host.endsWith(".localhost");
  return `${local ? "http" : "https"}://${host}`;
}

export const pageUrl = (origin: string, path: string) =>
  `${origin}${path === "/" ? "/" : path}`;

/* ------------------------------------------------------------------ */
/* Pages                                                                */
/* ------------------------------------------------------------------ */

type Block = { type: string; props: Record<string, unknown> };
export type PageLike = {
  root: { props?: Record<string, unknown> };
  content: Block[];
};

export type PublishedPage = {
  path: string;
  data: PageLike;
  /** ISO date of the last publication. */
  modified: string;
};

export const rootOf = (data: PageLike) =>
  (data.root?.props ?? {}) as {
    title?: string;
    description?: string;
    ogImage?: string;
    noindex?: boolean;
  };

export const isNoindex = (data: PageLike) => rootOf(data).noindex === true;

/** First picture of the page, used when no share image was chosen. */
export function firstImage(data: PageLike): string {
  for (const b of data.content) {
    const img = b.props?.image;
    if (typeof img === "string" && img) return img;
    const bg = b.props?.bgImage;
    if (typeof bg === "string" && bg) return bg;
  }
  return "";
}

export const absolute = (origin: string, url: string) =>
  !url
    ? ""
    : isHttp(url)
    ? url
    : `${origin}${url.startsWith("/") ? "" : "/"}${url}`;

/* ------------------------------------------------------------------ */
/* robots.txt                                                           */
/* ------------------------------------------------------------------ */

export function buildRobots(opts: {
  seo: Seo;
  origin: string;
  /** false on addresses that must not be indexed (provisional address of a site with its own domain). */
  canonicalHost: boolean;
}) {
  const { seo } = opts;
  const lines: string[] = ["# Gerado pela Vitrine"];
  const open = seo.indexable && opts.canonicalHost;

  if (!open) {
    lines.push("User-agent: *", "Disallow: /", "");
    return lines.join("\n");
  }
  lines.push("User-agent: *", "Allow: /", "Disallow: /api/", "");
  const group = (bots: AiBot[], allowed: boolean, title: string) => {
    lines.push(`# ${title}`);
    for (const b of bots)
      lines.push(
        `User-agent: ${b.agent}`,
        allowed ? "Allow: /" : "Disallow: /",
        ""
      );
  };
  group(
    AI_SEARCH_BOTS,
    seo.aiSearch,
    seo.aiSearch
      ? "Agentes de IA que respondem perguntas e buscam (permitidos)"
      : "Agentes de IA que respondem perguntas e buscam (bloqueados)"
  );
  group(
    AI_TRAINING_BOTS,
    seo.aiTraining,
    seo.aiTraining
      ? "Coleta para treino de modelos (permitida)"
      : "Coleta para treino de modelos (bloqueada)"
  );
  lines.push(`Sitemap: ${opts.origin}/sitemap.xml`);
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* sitemap.xml                                                          */
/* ------------------------------------------------------------------ */

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function indexablePages(pages: PublishedPage[]) {
  return pages
    .filter((p) => !isNoindex(p.data))
    .sort((a, b) =>
      a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)
    );
}

export function buildSitemap(origin: string, pages: PublishedPage[]) {
  const urls = indexablePages(pages)
    .map(
      (p) =>
        `  <url>\n    <loc>${xml(
          pageUrl(origin, p.path)
        )}</loc>\n    <lastmod>${xml(p.modified)}</lastmod>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/* ------------------------------------------------------------------ */
/* Page -> Markdown                                                     */
/* ------------------------------------------------------------------ */

/** Fields that hold addresses, ids or settings, not text people read. */
const NOT_TEXT = new Set([
  "href",
  "url",
  "anchor",
  "id",
  "customCss",
  "bgImage",
  "ratio",
  "formName",
  "successMessage",
]);

const clean = (s: unknown) =>
  typeof s === "string" ? s.replace(/\r/g, "").trim() : "";

function readList(
  def: Extract<FieldDef, { type: "list" }>,
  items: unknown,
  type: string
): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const raw of items as Record<string, unknown>[]) {
    if (!raw || typeof raw !== "object") continue;
    const label = clean(raw.label);
    const href = clean(raw.href);
    // Buttons and links.
    if (label && href && Object.keys(def.item).length <= 3) {
      out.push(`- [${label}](${href})`);
      continue;
    }
    if (type === "Faq") {
      const q = clean(raw.question);
      if (q) out.push(`### ${q}`, "", clean(raw.answer), "");
      continue;
    }
    const texts: string[] = [];
    for (const [k, f] of Object.entries(def.item)) {
      if ((f.type !== "text" && f.type !== "textarea") || NOT_TEXT.has(k))
        continue;
      const v = clean(raw[k]);
      if (v) texts.push(v);
    }
    if (!texts.length) continue;
    const [first, ...rest] = texts;
    out.push(`- **${first}**${rest.length ? `: ${rest.join(" — ")}` : ""}`);
  }
  return out;
}

/** The readable text of a published page, in Markdown. */
export function pageToMarkdown(data: PageLike, fallbackTitle = ""): string {
  const root = rootOf(data);
  const out: string[] = [];
  const hasHero = data.content.some((b) => b.type === "Hero");
  const heading = clean(root.title) || fallbackTitle;
  if (!hasHero && heading) out.push(`# ${heading}`, "");
  if (clean(root.description)) out.push(`> ${clean(root.description)}`, "");

  for (const block of data.content) {
    if (["Nav", "Space", "Divider", "Embed"].includes(block.type)) continue;
    let defs: Record<string, FieldDef>;
    try {
      defs = fieldsFor(block.type as BlockName);
    } catch {
      continue;
    }
    const p = block.props ?? {};
    const lines: string[] = [];
    const title = (clean(p.title) || clean(p.brand)).replace(/\s*\n\s*/g, " ");
    if (title) lines.push(`${block.type === "Hero" ? "#" : "##"} ${title}`, "");
    for (const [k, def] of Object.entries(defs)) {
      if (k === "title" || NOT_TEXT.has(k)) continue;
      if (def.type === "text" || def.type === "textarea") {
        const v = clean(p[k]);
        if (v) lines.push(v, "");
      } else if (def.type === "list") {
        const l = readList(def, p[k], block.type);
        if (l.length) lines.push(...l, "");
      }
    }
    if (lines.length) out.push(...lines);
  }
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

export const wordCount = (md: string) =>
  md.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/* ------------------------------------------------------------------ */
/* llms.txt                                                             */
/* ------------------------------------------------------------------ */

export type SiteInfo = { name: string; lang?: string };

export function businessName(site: SiteInfo, seo: Seo) {
  return seo.businessName || site.name;
}

function contactLines(seo: Seo): string[] {
  const addr = [seo.street, seo.city, seo.region, seo.postalCode]
    .filter(Boolean)
    .join(", ");
  return [
    addr && `Endereço: ${addr}`,
    seo.areaServed && `Atendimento: ${seo.areaServed}`,
    seo.phone && `Telefone: ${seo.phone}`,
    seo.email && `E-mail: ${seo.email}`,
  ].filter(Boolean) as string[];
}

export function buildLlmsTxt(opts: {
  site: SiteInfo;
  seo: Seo;
  origin: string;
  pages: PublishedPage[];
}) {
  const { site, seo, origin } = opts;
  const pages = indexablePages(opts.pages);
  const home = pages.find((p) => p.path === "/");
  const summary =
    seo.about || (home ? clean(rootOf(home.data).description) : "");
  const out = [`# ${businessName(site, seo)}`, ""];
  if (summary) out.push(`> ${summary}`, "");
  const contact = contactLines(seo);
  if (contact.length) out.push(...contact.map((c) => `- ${c}`), "");
  out.push("## Páginas", "");
  for (const p of pages) {
    const r = rootOf(p.data);
    const title =
      clean(r.title) || (p.path === "/" ? businessName(site, seo) : p.path);
    const desc = clean(r.description);
    out.push(
      `- [${title}](${origin}${markdownPath(p.path)})${desc ? `: ${desc}` : ""}`
    );
  }
  out.push(
    "",
    "## Conteúdo completo",
    "",
    `- [Todas as páginas em um só arquivo](${origin}/llms-full.txt)`,
    ""
  );
  return out.join("\n");
}

export function buildLlmsFull(opts: {
  site: SiteInfo;
  seo: Seo;
  origin: string;
  pages: PublishedPage[];
}) {
  const { site, seo, origin } = opts;
  const parts = [`# ${businessName(site, seo)}`, ""];
  if (seo.about) parts.push(`> ${seo.about}`, "");
  const contact = contactLines(seo);
  if (contact.length) parts.push(...contact.map((c) => `- ${c}`), "");
  for (const p of indexablePages(opts.pages)) {
    parts.push(
      "---",
      "",
      `Fonte: ${pageUrl(origin, p.path)}`,
      "",
      pageToMarkdown(p.data, site.name).trim(),
      ""
    );
  }
  return parts.join("\n");
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                              */
/* ------------------------------------------------------------------ */

/** JSON safe to place inside a <script> tag. */
export const safeJson = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export function buildJsonLd(opts: {
  site: SiteInfo;
  seo: Seo;
  origin: string;
  path: string;
  data: PageLike;
  modified?: string;
}) {
  const { site, seo, origin, path, data } = opts;
  const r = rootOf(data);
  const name = businessName(site, seo);
  const orgId = `${origin}/#organization`;
  const siteId = `${origin}/#website`;
  const url = pageUrl(origin, path);
  const title = clean(r.title) || (path === "/" ? name : path);
  const image = absolute(origin, r.ogImage || firstImage(data));

  const org: Record<string, unknown> = {
    "@type": seo.businessType,
    "@id": orgId,
    name,
    url: `${origin}/`,
  };
  const about = seo.about || clean(rootOf(data).description);
  if (about) org.description = about;
  if (seo.logo)
    org.logo = { "@type": "ImageObject", url: absolute(origin, seo.logo) };
  if (seo.phone) org.telephone = seo.phone;
  if (seo.email) org.email = seo.email;
  if (seo.street || seo.city || seo.region || seo.postalCode)
    org.address = {
      "@type": "PostalAddress",
      streetAddress: seo.street || undefined,
      addressLocality: seo.city || undefined,
      addressRegion: seo.region || undefined,
      postalCode: seo.postalCode || undefined,
      addressCountry: seo.country,
    };
  if (seo.areaServed) org.areaServed = seo.areaServed;
  if (seo.sameAs.length) org.sameAs = seo.sameAs;

  const graph: Record<string, unknown>[] = [
    org,
    {
      "@type": "WebSite",
      "@id": siteId,
      url: `${origin}/`,
      name,
      inLanguage: site.lang ?? "pt-BR",
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description: clean(r.description) || undefined,
      inLanguage: site.lang ?? "pt-BR",
      isPartOf: { "@id": siteId },
      about: { "@id": orgId },
      dateModified: opts.modified || undefined,
      primaryImageOfPage: image
        ? { "@type": "ImageObject", url: image }
        : undefined,
    },
  ];

  if (path !== "/") {
    const parts = path.split("/").filter(Boolean);
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name, item: `${origin}/` },
        ...parts.map((seg, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: i === parts.length - 1 ? title : seg,
          item: `${origin}/${parts.slice(0, i + 1).join("/")}`,
        })),
      ],
    });
  }

  // Questions and answers on the page, in the format answer engines read.
  const faq: { question: string; answer: string }[] = [];
  for (const b of data.content)
    if (b.type === "Faq" && Array.isArray(b.props.items))
      for (const it of b.props.items as Record<string, unknown>[]) {
        const q = clean(it.question);
        const a = clean(it.answer);
        if (q && a) faq.push({ question: q, answer: a });
      }
  if (faq.length)
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });

  return { "@context": "https://schema.org", "@graph": graph };
}

/* ------------------------------------------------------------------ */
/* Audit                                                                */
/* ------------------------------------------------------------------ */

export type Finding = {
  level: "error" | "warn" | "info";
  text: string;
};

export type Audit = { score: number; findings: Finding[]; words: number };

/** What to fix on a page, from most to least important. */
export function auditPage(data: PageLike, site: SiteInfo): Audit {
  const r = rootOf(data);
  const f: Finding[] = [];
  const title = clean(r.title);
  const desc = clean(r.description);
  let score = 100;
  const hit = (level: Finding["level"], text: string, cost: number) => {
    f.push({ level, text });
    score -= cost;
  };

  if (r.noindex)
    hit(
      "info",
      "Esta página está marcada para não aparecer no Google nem nas IAs.",
      0
    );

  if (!title)
    hit(
      "error",
      "Sem título da página. É o texto azul que aparece no Google.",
      25
    );
  else if (title.length < 20)
    hit(
      "warn",
      `Título curto (${title.length} letras). Use entre 30 e 60, com o que a empresa faz e a cidade.`,
      8
    );
  else if (title.length > 65)
    hit(
      "warn",
      `Título longo (${title.length} letras). O Google corta depois de uns 60.`,
      6
    );

  if (!desc)
    hit(
      "error",
      "Sem descrição. Ela vira o resumo no Google e nas respostas de IA.",
      20
    );
  else if (desc.length < 70)
    hit(
      "warn",
      `Descrição curta (${desc.length} letras). Use entre 110 e 160.`,
      8
    );
  else if (desc.length > 170)
    hit(
      "warn",
      `Descrição longa (${desc.length} letras). O Google corta depois de uns 160.`,
      5
    );

  if (title && title === site.name)
    hit(
      "info",
      "O título é só o nome do site. Acrescente o que a empresa faz.",
      3
    );

  const h1 = data.content.filter((b) => b.type === "Hero").length;
  if (h1 === 0)
    hit(
      "warn",
      "Sem bloco de Abertura. A página precisa de um título principal (H1) para o Google e as IAs entenderem o assunto.",
      12
    );
  else if (h1 > 1)
    hit(
      "warn",
      "Há mais de uma Abertura. Use só uma por página: ela é o título principal (H1).",
      6
    );

  if (!r.ogImage && !firstImage(data))
    hit(
      "warn",
      "Sem imagem ao compartilhar o link (WhatsApp, LinkedIn). Escolha uma nos ajustes da página.",
      6
    );

  const missingAlt = data.content.filter(
    (b) => b.type === "Image" && b.props.image && !clean(b.props.alt)
  ).length;
  if (missingAlt)
    hit(
      "warn",
      `${missingAlt} imagem(ns) sem texto alternativo. Descreva a imagem para acessibilidade e busca.`,
      6
    );

  const words = wordCount(pageToMarkdown(data, site.name));
  if (words < 120)
    hit(
      "warn",
      `Pouco texto (${words} palavras). Páginas com pouco conteúdo têm dificuldade de aparecer e de ser citadas por IAs.`,
      8
    );

  const hasFaq = data.content.some((b) => b.type === "Faq");
  if (!hasFaq && words >= 120)
    hit(
      "info",
      "Perguntas frequentes ajudam a ser citado pelas IAs. Considere adicionar o bloco.",
      0
    );

  return { score: Math.max(0, score), findings: f, words };
}
