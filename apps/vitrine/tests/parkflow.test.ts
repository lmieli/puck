import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { validateProps, validateRoot } from "../ai/page-ops.ts";
import type { BlockName } from "../blocks/schema.ts";
import { INDEXES, SCHEMA } from "../lib/schema.ts";
import { PARKFLOW_SLUG, parkflowPages, parkflowSeo } from "../lib/parkflow.ts";
import { ensureParkflowSite, seed } from "../lib/seed.ts";
import { parseSeo } from "../lib/seo.ts";

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
  assert.deepEqual(Object.keys(pages), ["/"]);
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

test("as âncoras do menu existem na página", () => {
  const home = parkflowPages()["/"];
  const anchors = new Set(home.content.map((b) => b.props.anchor));
  const nav = home.content[0].props.links as { href: string }[];
  for (const l of [...nav, { href: home.content[0].props.ctaHref as string }])
    if (l.href.startsWith("#"))
      assert.ok(anchors.has(l.href.slice(1)), `âncora ${l.href} sumiu`);
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
