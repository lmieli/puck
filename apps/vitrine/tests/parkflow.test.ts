import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { validateProps, validateRoot } from "../ai/page-ops.ts";
import type { BlockName } from "../blocks/schema.ts";
import { INDEXES, SCHEMA } from "../lib/schema.ts";
import { PARKFLOW_SLUG, parkflowPages, parkflowSeo } from "../lib/parkflow.ts";
import { ensureParkflowSite, insertSite, seed } from "../lib/seed.ts";
import { auditPage, parseSeo } from "../lib/seo.ts";

const here = path.dirname(new URL(import.meta.url).pathname);

function freshDb() {
  const conn = new Database(":memory:");
  conn.exec(SCHEMA);
  // Colunas que o db.ts acrescenta em bancos antigos (migrate).
  for (const ddl of [
    "seo TEXT NOT NULL DEFAULT '{}'",
    "ai_model TEXT",
    "tracking TEXT NOT NULL DEFAULT '{}'",
    "whatsapp TEXT NOT NULL DEFAULT '{}'",
    "head_script TEXT NOT NULL DEFAULT ''",
    "limits TEXT NOT NULL DEFAULT '{}'",
    "credits INTEGER NOT NULL DEFAULT 0",
  ])
    conn.exec(`ALTER TABLE sites ADD COLUMN ${ddl}`);
  conn.exec(INDEXES);
  return conn;
}

test("todo bloco do site do ParkFlow passa na validação dos blocos", () => {
  const pages = parkflowPages();
  assert.deepEqual(Object.keys(pages), [
    "/",
    "/mensalistas",
    "/convenios",
    "/sem-cancela",
  ]);
  for (const page of Object.values(pages)) {
    validateRoot(page.root.props);
    for (const block of page.content) {
      const { id, ...props } = block.props;
      assert.ok(id, "bloco sem id");
      validateProps(block.type as BlockName, props, false);
    }
    const types = page.content.map((b) => b.type);
    assert.equal(types[0], "Nav");
    assert.equal(types.at(-1), "Footer");
    assert.ok(types.includes("Signup"), "tem o pedido de demonstração");
    assert.ok(types.includes("Faq"), "tem perguntas frequentes");
  }
});

test("todo link interno leva a uma página e âncora que existem", () => {
  const pages = parkflowPages();
  const anchors = (p: string) =>
    new Set(pages[p].content.map((b) => b.props.anchor));
  for (const [path, page] of Object.entries(pages)) {
    const hrefs = [
      ...JSON.stringify(page.content).matchAll(/"href":"([^"]*)"/g),
      ...JSON.stringify(page.content).matchAll(/\| (\/[^\\"]*|#[^\\"]*)/g),
    ].map((m) => m[1]);
    assert.ok(hrefs.length > 5);
    for (const href of hrefs) {
      if (!href || href.startsWith("http")) continue;
      const [target, anchor] = href.startsWith("#")
        ? [path, href.slice(1)]
        : [href.split("#")[0], href.split("#")[1]];
      assert.ok(pages[target], `${path}: página ${target} não existe`);
      if (anchor)
        assert.ok(anchors(target).has(anchor), `${path}: âncora ${href} sumiu`);
    }
  }
});

test("toda página tira nota 100 na revisão de SEO, com título próprio", () => {
  const pages = parkflowPages();
  const titles = new Set<string>();
  for (const [path, page] of Object.entries(pages)) {
    const audit = auditPage(page, {
      name: "ParkFlow",
      slug: "parkflow",
    } as never);
    assert.equal(
      audit.score,
      100,
      `${path}: ${JSON.stringify(audit.findings)}`
    );
    titles.add(String(page.root.props.title));
  }
  assert.equal(titles.size, Object.keys(pages).length, "títulos repetidos");
  assert.match(
    String(pages["/"].root.props.title),
    /^Sistema para estacionamento/
  );
});

test("toda imagem do site existe em public/modelos/parkflow", () => {
  const json = JSON.stringify(parkflowPages());
  const used = [...json.matchAll(/\/modelos\/parkflow\/[a-z_]+\.webp/g)].map(
    (m) => m[0]
  );
  assert.ok(used.length > 5);
  for (const p of new Set(used))
    assert.ok(
      fs.existsSync(path.join(here, "..", "public", p)),
      `imagem ausente: ${p}`
    );
});

test("os dados de SEO são válidos", () => {
  assert.deepEqual(parseSeo(JSON.stringify(parkflowSeo())), parkflowSeo());
});

test("banco novo ganha o site publicado do ParkFlow, uma vez só", () => {
  const conn = freshDb();
  seed(conn);
  const id = ensureParkflowSite(conn);
  assert.ok(id);
  const site = conn
    .prepare("SELECT * FROM sites WHERE slug = ?")
    .get(PARKFLOW_SLUG) as { id: string; seo: string; name: string };
  assert.equal(site.name, "ParkFlow");
  assert.equal(parseSeo(site.seo).businessName, "ParkFlow");
  const page = conn
    .prepare("SELECT * FROM pages WHERE site_id = ? AND path = '/'")
    .get(site.id) as { draft: string; published: string };
  assert.equal(page.draft, page.published, "já sai publicado");
  assert.equal(ensureParkflowSite(conn), null, "não duplica");
  assert.equal(
    (
      conn
        .prepare("SELECT COUNT(*) AS n FROM sites WHERE slug = ?")
        .get(PARKFLOW_SLUG) as { n: number }
    ).n,
    1
  );
});

test("site apagado pela agência não volta sozinho", () => {
  const conn = freshDb();
  seed(conn);
  ensureParkflowSite(conn);
  conn.prepare("DELETE FROM sites WHERE slug = ?").run(PARKFLOW_SLUG);
  assert.equal(ensureParkflowSite(conn), null);
  assert.equal(
    conn.prepare("SELECT 1 FROM sites WHERE slug = ?").get(PARKFLOW_SLUG),
    undefined
  );
});

test("não mexe num site que já usa o endereço parkflow", () => {
  const conn = freshDb();
  seed(conn);
  conn
    .prepare("INSERT INTO sites (id, slug, name) VALUES ('x', ?, 'Outro')")
    .run(PARKFLOW_SLUG);
  assert.equal(ensureParkflowSite(conn), null);
  const row = conn
    .prepare("SELECT name FROM sites WHERE slug = ?")
    .get(PARKFLOW_SLUG) as { name: string };
  assert.equal(row.name, "Outro");
});

test("site criado na 1ª versão ganha as páginas novas e o título novo", () => {
  const conn = freshDb();
  seed(conn);
  const owner = (
    conn.prepare("SELECT id FROM users WHERE is_super_admin = 1").get() as {
      id: string;
    }
  ).id;
  // Simula o banco da 1ª versão: só a página inicial, título antigo.
  const home = parkflowPages()["/"];
  home.root.props.title = "Título antigo";
  conn.exec(
    "CREATE TABLE seeded_sites (slug TEXT PRIMARY KEY, created_at TEXT)"
  );
  conn.prepare("INSERT INTO seeded_sites (slug) VALUES (?)").run(PARKFLOW_SLUG);
  const id = insertSite(conn, {
    slug: PARKFLOW_SLUG,
    name: "ParkFlow",
    template: "blank",
    pages: { "/": home },
    authorId: owner,
  });
  ensureParkflowSite(conn);
  const rows = conn
    .prepare(
      "SELECT path, published, published_version FROM pages WHERE site_id = ? ORDER BY path"
    )
    .all(id) as {
    path: string;
    published: string;
    published_version: number;
  }[];
  assert.deepEqual(
    rows.map((r) => r.path),
    ["/", "/convenios", "/mensalistas", "/sem-cancela"]
  );
  const root = rows.find((r) => r.path === "/")!;
  assert.equal(root.published_version, 2);
  assert.match(JSON.parse(root.published).root.props.title, /^Sistema para/);
  const v1 = conn
    .prepare(
      "SELECT data FROM versions WHERE site_id = ? AND path = '/' AND number = 1"
    )
    .get(id) as { data: string };
  assert.equal(
    JSON.parse(v1.data).root.props.title,
    "Título antigo",
    "v1 fica no histórico"
  );
  // Rodar de novo não muda nada.
  ensureParkflowSite(conn);
  assert.equal(
    (
      conn
        .prepare("SELECT COUNT(*) AS n FROM versions WHERE site_id = ?")
        .get(id) as { n: number }
    ).n,
    5
  );
});

test("página inicial editada pela agência não é trocada na atualização", () => {
  const conn = freshDb();
  seed(conn);
  const owner = (
    conn.prepare("SELECT id FROM users WHERE is_super_admin = 1").get() as {
      id: string;
    }
  ).id;
  conn.exec(
    "CREATE TABLE seeded_sites (slug TEXT PRIMARY KEY, created_at TEXT)"
  );
  conn.prepare("INSERT INTO seeded_sites (slug) VALUES (?)").run(PARKFLOW_SLUG);
  const id = insertSite(conn, {
    slug: PARKFLOW_SLUG,
    name: "ParkFlow",
    template: "blank",
    pages: { "/": parkflowPages()["/"] },
    authorId: owner,
  });
  conn
    .prepare(
      "UPDATE pages SET draft = '{\"editado\":true}' WHERE site_id = ? AND path = '/'"
    )
    .run(id);
  ensureParkflowSite(conn);
  const root = conn
    .prepare(
      "SELECT draft, published_version FROM pages WHERE site_id = ? AND path = '/'"
    )
    .get(id) as { draft: string; published_version: number };
  assert.equal(root.draft, '{"editado":true}');
  assert.equal(root.published_version, 1);
  assert.equal(
    (
      conn
        .prepare("SELECT COUNT(*) AS n FROM pages WHERE site_id = ?")
        .get(id) as { n: number }
    ).n,
    4,
    "as páginas novas entram mesmo assim"
  );
});
