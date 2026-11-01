import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyOperation,
  emptyPage,
  OpError,
  outline,
  type PageData,
} from "../ai/page-ops.ts";
import { blockNames } from "../blocks/schema.ts";
import { buildTemplate } from "../lib/templates.ts";
import { blockCatalog, SYSTEM_PROMPT } from "../ai/prompt.ts";

const base = (): PageData => {
  let page = emptyPage("Teste");
  page = applyOperation(page, "insert_block", {
    type: "Nav",
    props: { brand: "Marca" },
  }).page;
  page = applyOperation(page, "insert_block", {
    type: "Hero",
    props: { title: "Olá" },
  }).page;
  return page;
};

test("insert_block fills defaults and assigns ids", () => {
  const page = base();
  assert.equal(page.content.length, 2);
  const hero = page.content[1];
  assert.equal(hero.type, "Hero");
  assert.equal(hero.props.title, "Olá");
  assert.equal(hero.props.variant, "cinematic", "default variant applied");
  assert.match(hero.props.id, /^Hero-/);
});

test("insert_block honours after_id and index", () => {
  let page = base();
  page = applyOperation(page, "insert_block", {
    type: "Reveal",
    props: {},
    after_id: page.content[0].props.id,
  }).page;
  assert.deepEqual(
    page.content.map((b) => b.type),
    ["Nav", "Reveal", "Hero"]
  );
  page = applyOperation(page, "insert_block", {
    type: "Footer",
    props: {},
    index: 99,
  }).page;
  assert.equal(page.content.at(-1)!.type, "Footer");
});

test("update_block merges props and keeps id", () => {
  let page = base();
  const id = page.content[1].props.id;
  page = applyOperation(page, "update_block", {
    id,
    props: { subtitle: "Novo", tone: "inverse" },
  }).page;
  assert.equal(page.content[1].props.subtitle, "Novo");
  assert.equal(page.content[1].props.title, "Olá");
  assert.equal(page.content[1].props.id, id);
});

test("list items are normalised with item defaults", () => {
  let page = base();
  page = applyOperation(page, "insert_block", {
    type: "Stats",
    props: { items: [{ value: "10x" }] },
  }).page;
  const stats = page.content.at(-1)!;
  assert.deepEqual(stats.props.items, [{ value: "10x", label: "" }]);
});

test("invalid props are rejected with a helpful message", () => {
  const page = base();
  assert.throws(
    () =>
      applyOperation(page, "update_block", {
        id: page.content[1].props.id,
        props: { variant: "giant" },
      }),
    (e: unknown) => e instanceof OpError && /variant/.test((e as Error).message)
  );
  assert.throws(
    () =>
      applyOperation(page, "update_block", {
        id: page.content[1].props.id,
        props: { colour: "red" },
      }),
    (e: unknown) =>
      e instanceof OpError && /Campos aceitos/.test((e as Error).message)
  );
  assert.throws(
    () => applyOperation(page, "insert_block", { type: "Carousel", props: {} }),
    OpError
  );
  assert.throws(
    () => applyOperation(page, "update_page", { props: { accent: "blue" } }),
    OpError
  );
});

test("unknown ids and tools fail cleanly", () => {
  const page = base();
  assert.throws(
    () => applyOperation(page, "remove_block", { id: "nope" }),
    OpError
  );
  assert.throws(() => applyOperation(page, "explode", {}), OpError);
});

test("move, remove and update_page", () => {
  let page = base();
  const heroId = page.content[1].props.id;
  page = applyOperation(page, "move_block", { id: heroId, index: 0 }).page;
  assert.equal(page.content[0].type, "Hero");
  page = applyOperation(page, "remove_block", { id: heroId }).page;
  assert.deepEqual(
    page.content.map((b) => b.type),
    ["Nav"]
  );
  page = applyOperation(page, "update_page", {
    props: { theme: "dark", accent: "#ff3b30" },
  }).page;
  assert.equal(page.root.props.theme, "dark");
  assert.equal(page.root.props.accent, "#ff3b30");
});

test("replace_content validates every block and reports all errors", () => {
  const page = base();
  const ok = applyOperation(page, "replace_content", {
    blocks: [
      { type: "Nav", props: {} },
      { type: "Product3D", props: { shape: "watch" } },
      { type: "Footer", props: {} },
    ],
  });
  assert.equal(ok.page.content.length, 3);
  assert.throws(
    () =>
      applyOperation(page, "replace_content", {
        blocks: [
          { type: "Nav", props: { x: 1 } },
          { type: "Nope", props: {} },
        ],
      }),
    (e: unknown) =>
      /bloco 0/.test((e as Error).message) &&
      /bloco 1/.test((e as Error).message)
  );
});

test("operations never mutate the input page", () => {
  const page = base();
  const snapshot = JSON.stringify(page);
  applyOperation(page, "update_block", {
    id: page.content[1].props.id,
    props: { title: "x" },
  });
  applyOperation(page, "remove_block", { id: page.content[0].props.id });
  assert.equal(JSON.stringify(page), snapshot);
});

test("templates only use valid blocks and props", () => {
  for (const id of ["produto", "construtora", "blank"] as const) {
    for (const [path, data] of Object.entries(buildTemplate(id, "Teste"))) {
      for (const block of data.content) {
        const { id: _id, ...props } = block.props;
        // Re-inserting through the validated path must succeed.
        assert.doesNotThrow(
          () =>
            applyOperation(emptyPage(), "insert_block", {
              type: block.type,
              props,
            }),
          `${id} ${path} ${block.type}`
        );
      }
    }
  }
});

test("catalog and prompt cover every block", () => {
  const cat = blockCatalog();
  for (const name of blockNames) {
    assert.ok(name in cat.blocks, name);
    assert.ok(SYSTEM_PROMPT.includes(`"${name}"`), name);
  }
  assert.match(outline(base()), /1\. Hero id=Hero-.* — "Olá"/);
});
