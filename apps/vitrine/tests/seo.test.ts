import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePath, pathFromMarkdown, markdownPath } from "../lib/paths.ts";
import {
  AI_SEARCH_BOTS,
  AI_TRAINING_BOTS,
  auditPage,
  buildJsonLd,
  buildLlmsFull,
  buildLlmsTxt,
  buildRobots,
  buildSitemap,
  EMPTY_SEO,
  originFor,
  pageToMarkdown,
  parseSeo,
  safeJson,
  validateSeo,
  type PageLike,
  type PublishedPage,
} from "../lib/seo.ts";

const home: PageLike = {
  root: {
    props: {
      title: "Construtora em Curitiba | Gemini Engenharia",
      description:
        "Projetos e obras residenciais e comerciais em Curitiba, com prazo e orçamento acompanhados semana a semana.",
      ogImage: "/media/x/og.png",
    },
  },
  content: [
    { type: "Nav", props: { brand: "Gemini" } },
    {
      type: "Hero",
      props: {
        variant: "cinematic",
        eyebrow: "Desde 1998",
        title: "Obras que cumprem o que prometem.",
        subtitle: "Engenharia residencial e comercial em Curitiba.",
        buttons: [
          { label: "Pedir orçamento", href: "#contato", style: "primary" },
        ],
      },
    },
    {
      type: "Faq",
      props: {
        title: "Perguntas frequentes",
        items: [
          { question: "Qual o prazo médio?", answer: "De 8 a 14 meses." },
          { question: "Fazem reformas?", answer: "Sim, a partir de 60 m²." },
        ],
      },
    },
  ],
};

const about: PageLike = {
  root: { props: { title: "Sobre", description: "x", noindex: false } },
  content: [],
};
const hidden: PageLike = {
  root: { props: { title: "Obrigado", noindex: true } },
  content: [],
};

const pages: PublishedPage[] = [
  { path: "/", data: home, modified: "2026-11-01T10:00:00.000Z" },
  { path: "/sobre", data: about, modified: "2026-10-01T10:00:00.000Z" },
  { path: "/obrigado", data: hidden, modified: "2026-10-02T10:00:00.000Z" },
];

test("robots.txt names every AI crawler and follows the site's choices", () => {
  const open = buildRobots({
    seo: EMPTY_SEO,
    origin: "https://gemini.com.br",
    canonicalHost: true,
  });
  assert.match(open, /Sitemap: https:\/\/gemini\.com\.br\/sitemap\.xml/);
  for (const b of [...AI_SEARCH_BOTS, ...AI_TRAINING_BOTS])
    assert.match(open, new RegExp(`User-agent: ${b.agent}\\nAllow: /`));
  for (const a of [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
  ])
    assert.ok(open.includes(`User-agent: ${a}`), a);

  const noTraining = buildRobots({
    seo: { ...EMPTY_SEO, aiTraining: false },
    origin: "https://x.com",
    canonicalHost: true,
  });
  assert.match(noTraining, /User-agent: GPTBot\nDisallow: \//);
  assert.match(noTraining, /User-agent: ClaudeBot\nDisallow: \//);
  assert.match(
    noTraining,
    /User-agent: PerplexityBot\nAllow: \//,
    "answers stay on"
  );

  const noAi = buildRobots({
    seo: { ...EMPTY_SEO, aiSearch: false },
    origin: "https://x.com",
    canonicalHost: true,
  });
  assert.match(noAi, /User-agent: OAI-SearchBot\nDisallow: \//);
  assert.match(noAi, /User-agent: \*\nAllow: \//, "search engines stay on");

  const closed = buildRobots({
    seo: { ...EMPTY_SEO, indexable: false },
    origin: "https://x.com",
    canonicalHost: true,
  });
  assert.equal(closed.includes("Sitemap"), false);
  assert.match(closed, /User-agent: \*\nDisallow: \/\n/);
  const provisional = buildRobots({
    seo: EMPTY_SEO,
    origin: "https://x.vitrine.app",
    canonicalHost: false,
  });
  assert.match(provisional, /Disallow: \/\n/);
  assert.equal(provisional.includes("GPTBot"), false);
});

test("sitemap lists published, indexable pages with their dates", () => {
  const xml = buildSitemap("https://gemini.com.br", pages);
  assert.match(xml, /<loc>https:\/\/gemini\.com\.br\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/gemini\.com\.br\/sobre<\/loc>/);
  assert.match(xml, /<lastmod>2026-11-01T10:00:00\.000Z<\/lastmod>/);
  assert.equal(xml.includes("/obrigado"), false, "noindex pages are left out");
  assert.ok(xml.indexOf("gemini.com.br/</loc>") < xml.indexOf("/sobre"));
});

test("pages become clean Markdown for AI agents", () => {
  const md = pageToMarkdown(home, "Gemini");
  assert.match(md, /^# Obras que cumprem o que prometem\./m);
  assert.match(md, /> Projetos e obras residenciais/);
  assert.match(md, /Engenharia residencial e comercial em Curitiba\./);
  assert.match(md, /- \[Pedir orçamento\]\(#contato\)/);
  assert.match(md, /### Qual o prazo médio\?\n\nDe 8 a 14 meses\./);
  assert.equal(
    md.includes("cinematic"),
    false,
    "no settings leak into the text"
  );
  assert.equal(md.includes("/media/x/og.png"), false);
  // A page with no Hero gets its title as the H1.
  assert.match(pageToMarkdown(about, "Gemini"), /^# Sobre/);
});

test("llms.txt maps the site and llms-full.txt carries its text", () => {
  const seo = {
    ...EMPTY_SEO,
    about: "Construtora de Curitiba.",
    phone: "(41) 3000-0000",
    city: "Curitiba",
  };
  const txt = buildLlmsTxt({
    site: { name: "Gemini" },
    seo,
    origin: "https://gemini.com.br",
    pages,
  });
  assert.match(txt, /^# Gemini\n\n> Construtora de Curitiba\./);
  assert.match(txt, /Telefone: \(41\) 3000-0000/);
  assert.match(
    txt,
    /\[Construtora em Curitiba \| Gemini Engenharia\]\(https:\/\/gemini\.com\.br\/index\.md\)/
  );
  assert.match(txt, /\(https:\/\/gemini\.com\.br\/sobre\.md\)/);
  assert.equal(txt.includes("obrigado"), false);
  const full = buildLlmsFull({
    site: { name: "Gemini" },
    seo,
    origin: "https://gemini.com.br",
    pages,
  });
  assert.match(full, /Fonte: https:\/\/gemini\.com\.br\/sobre/);
  assert.match(full, /De 8 a 14 meses/);
  assert.equal(full.includes("Obrigado"), false);
});

test("JSON-LD describes the business, the page, breadcrumbs and FAQ", () => {
  const seo = validateSeo({
    businessName: "Gemini Engenharia",
    businessType: "HomeAndConstructionBusiness",
    phone: "(41) 3000-0000",
    street: "Rua A, 10",
    city: "Curitiba",
    region: "PR",
    sameAs:
      "https://www.instagram.com/gemini\nhttps://www.linkedin.com/company/gemini",
  });
  assert.ok("value" in seo);
  const ld = buildJsonLd({
    site: { name: "Gemini" },
    seo: (seo as { value: typeof EMPTY_SEO }).value,
    origin: "https://gemini.com.br",
    path: "/",
    data: home,
    modified: "2026-11-01T10:00:00.000Z",
  }) as { "@graph": Record<string, any>[] };
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.deepEqual(types, [
    "HomeAndConstructionBusiness",
    "WebSite",
    "WebPage",
    "FAQPage",
  ]);
  const org = ld["@graph"][0];
  assert.equal(org.name, "Gemini Engenharia");
  assert.equal(org.address.addressLocality, "Curitiba");
  assert.equal(org.sameAs.length, 2);
  const page = ld["@graph"][2];
  assert.equal(page.url, "https://gemini.com.br/");
  assert.equal(
    page.primaryImageOfPage.url,
    "https://gemini.com.br/media/x/og.png"
  );
  assert.equal(
    ld["@graph"][3].mainEntity[0].acceptedAnswer.text,
    "De 8 a 14 meses."
  );

  const inner = buildJsonLd({
    site: { name: "Gemini" },
    seo: EMPTY_SEO,
    origin: "https://gemini.com.br",
    path: "/servicos/reformas",
    data: about,
  }) as { "@graph": Record<string, any>[] };
  const crumbs = inner["@graph"].find((n) => n["@type"] === "BreadcrumbList")!;
  assert.equal(crumbs.itemListElement.length, 3);
  assert.equal(
    crumbs.itemListElement[2].item,
    "https://gemini.com.br/servicos/reformas"
  );
});

test("safeJson cannot close the script tag", () => {
  const out = safeJson({ a: "</script><script>alert(1)</script>" });
  assert.equal(out.includes("</script>"), false);
  assert.deepEqual(JSON.parse(out), {
    a: "</script><script>alert(1)</script>",
  });
});

test("settings are validated and unsafe values are rejected", () => {
  assert.deepEqual(parseSeo("not json"), EMPTY_SEO);
  assert.equal(parseSeo("{}").indexable, true);
  const bad = validateSeo({ sameAs: "javascript:alert(1)" });
  assert.ok("error" in bad);
  assert.ok("error" in validateSeo({ businessType: "Hacker" }));
  assert.ok("error" in validateSeo({ email: "nope" }));
  assert.ok("error" in validateSeo({ logo: "javascript:alert(1)" }));
  const ok = validateSeo({
    indexable: false,
    aiTraining: false,
    aiSearch: "on",
    about: "  oi   mundo ",
  });
  assert.ok("value" in ok);
  const v = (ok as { value: typeof EMPTY_SEO }).value;
  assert.equal(v.indexable, false);
  assert.equal(v.aiTraining, false);
  assert.equal(v.aiSearch, true);
  assert.equal(v.about, "oi mundo");
});

test("audit points at what to fix", () => {
  const good = auditPage(
    {
      ...home,
      content: [
        ...home.content,
        {
          type: "Text",
          props: { title: "Como trabalhamos", body: "palavra ".repeat(150) },
        },
      ],
    },
    { name: "Gemini" }
  );
  assert.equal(good.findings.filter((f) => f.level === "error").length, 0);
  assert.ok(good.score >= 90, String(good.score));

  const poor = auditPage(
    { root: { props: {} }, content: [] },
    { name: "Gemini" }
  );
  assert.ok(poor.score < 50);
  const text = poor.findings.map((f) => f.text).join(" | ");
  assert.match(text, /Sem título/);
  assert.match(text, /Sem descrição/);
  assert.match(text, /Abertura/);
  assert.equal(
    auditPage(hidden, { name: "x" }).findings[0].level,
    "info",
    "noindex is explained"
  );
});

test("markdown addresses round-trip", () => {
  assert.equal(markdownPath("/"), "/index.md");
  assert.equal(markdownPath("/sobre"), "/sobre.md");
  assert.equal(pathFromMarkdown("/index.md"), "/");
  assert.equal(pathFromMarkdown("/sobre.md"), "/sobre");
  assert.equal(pathFromMarkdown("/a/b.md"), "/a/b");
  assert.equal(pathFromMarkdown("/sobre"), null);
  assert.equal(normalizePath("/Sobre/"), "/sobre");
  assert.equal(originFor("gemini.com.br"), "https://gemini.com.br");
  assert.equal(originFor("x.vitrine.localhost"), "http://x.vitrine.localhost");
});
