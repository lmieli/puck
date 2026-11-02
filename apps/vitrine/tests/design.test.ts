import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOperation, emptyPage, OpError } from "../ai/page-ops.ts";
import { blockCatalog, SYSTEM_PROMPT } from "../ai/prompt.ts";
import {
  embedUrl,
  presets,
  sanitizeCss,
  styleKeys,
  googleFontsUrl,
} from "../blocks/design.ts";
import {
  blocks,
  commonKeys,
  fillDefaults,
  rootDefaults,
  rootFields,
} from "../blocks/schema.ts";

const page = () =>
  applyOperation(emptyPage(), "insert_block", {
    type: "Feature",
    props: { title: "Oi" },
  }).page;

test("every block accepts the shared style props", () => {
  let p = page();
  const id = p.content[0].props.id;
  p = applyOperation(p, "update_block", {
    id,
    props: {
      spaceTop: "xl",
      spaceBottom: "none",
      width: "narrow",
      textAlign: "left",
      bgColor: "#101010",
      textColor: "#ffffff",
      animation: "zoom",
      hideOn: "mobile",
      anchor: "sobre",
    },
  }).page;
  assert.equal(p.content[0].props.spaceTop, "xl");
  assert.equal(p.content[0].props.hideOn, "mobile");
  assert.equal(p.content[0].props.title, "Oi", "content untouched");
});

test("optional colours accept empty, required ones do not, bad values fail", () => {
  const p = page();
  const id = p.content[0].props.id;
  assert.doesNotThrow(() =>
    applyOperation(p, "update_block", { id, props: { bgColor: "" } })
  );
  assert.throws(
    () => applyOperation(p, "update_block", { id, props: { bgColor: "red" } }),
    OpError
  );
  assert.throws(
    () =>
      applyOperation(p, "update_block", { id, props: { spaceTop: "huge" } }),
    OpError
  );
  assert.throws(
    () => applyOperation(p, "update_page", { props: { accent: "" } }),
    OpError
  );
  assert.doesNotThrow(() =>
    applyOperation(p, "update_page", { props: { bgColor: "" } })
  );
});

test("new page settings are accepted and validated", () => {
  const p = applyOperation(page(), "update_page", {
    props: {
      theme: "auto",
      headingFont: "fraunces",
      bodyFont: "dmsans",
      headingWeight: "800",
      titleScale: "lg",
      radius: "xl",
      buttonShape: "square",
      contentWidth: "wide",
      density: "airy",
      animations: false,
      customCss: ".v-h2{color:red}",
    },
  }).page;
  assert.equal(p.root.props.radius, "xl");
  assert.equal(p.root.props.animations, false);
  assert.throws(
    () =>
      applyOperation(p, "update_page", {
        props: { headingFont: "comic-sans" },
      }),
    OpError
  );
  assert.throws(
    () => applyOperation(p, "update_page", { props: { radius: "round" } }),
    OpError
  );
});

test("hero size controls", () => {
  let p = applyOperation(emptyPage(), "insert_block", {
    type: "Hero",
    props: { mediaSize: "full", titleSize: "lg", imagePosition: "top" },
  }).page;
  assert.equal(p.content[0].props.mediaSize, "full");
  p = applyOperation(p, "update_block", {
    id: p.content[0].props.id,
    props: { mediaSize: "small" },
  }).page;
  assert.equal(p.content[0].props.mediaSize, "small");
  assert.throws(
    () =>
      applyOperation(p, "update_block", {
        id: p.content[0].props.id,
        props: { mediaSize: "huge" },
      }),
    OpError
  );
});

test("new blocks insert with defaults and validate their lists", () => {
  for (const type of [
    "Text",
    "Image",
    "Cards",
    "Pricing",
    "Logos",
    "Embed",
    "Divider",
  ]) {
    const p = applyOperation(emptyPage(), "insert_block", {
      type,
      props: {},
    }).page;
    assert.equal(p.content[0].type, type);
    assert.equal(
      p.content[0].props.hideOn,
      "never",
      `${type} has shared defaults`
    );
  }
  const pricing = applyOperation(emptyPage(), "insert_block", {
    type: "Pricing",
    props: {
      plans: [
        { name: "Solo", price: "R$ 10", features: "A\nB", highlight: true },
      ],
    },
  }).page;
  assert.deepEqual(
    (pricing.content[0].props.plans as { buttonLabel: string }[])[0]
      .buttonLabel,
    ""
  );
  assert.throws(
    () =>
      applyOperation(emptyPage(), "insert_block", {
        type: "Cards",
        props: { columns: "9" },
      }),
    OpError
  );
});

test("fillDefaults adds missing props without touching existing ones", () => {
  const old = {
    root: { props: { title: "Meu site", accent: "#ff0000" } },
    content: [
      {
        type: "Hero",
        props: { id: "Hero-1", title: "Já salvo", variant: "split" },
      },
    ],
  };
  const filled = fillDefaults(old);
  assert.equal(filled.root.props.accent, "#ff0000");
  assert.equal(filled.root.props.radius, rootDefaults.radius);
  const hero = filled.content[0].props;
  assert.equal(hero.title, "Já salvo");
  assert.equal(hero.variant, "split");
  assert.equal(hero.mediaSize, "large");
  assert.equal(hero.spaceTop, "auto");
  assert.equal(
    JSON.stringify(old).includes("mediaSize"),
    false,
    "input not mutated"
  );
});

test("embed links are normalised and unsafe ones refused", () => {
  assert.equal(
    embedUrl("https://www.youtube.com/watch?v=abc123"),
    "https://www.youtube-nocookie.com/embed/abc123"
  );
  assert.equal(
    embedUrl("https://youtu.be/abc123"),
    "https://www.youtube-nocookie.com/embed/abc123"
  );
  assert.equal(
    embedUrl("https://vimeo.com/123456"),
    "https://player.vimeo.com/video/123456"
  );
  assert.equal(
    embedUrl("https://www.loom.com/share/xyz"),
    "https://www.loom.com/embed/xyz"
  );
  assert.ok(embedUrl("https://www.google.com/maps/embed?pb=!1m18"));
  assert.equal(embedUrl("https://www.google.com/maps/place/Foo"), null);
  assert.equal(embedUrl("http://youtu.be/abc"), null);
  assert.equal(embedUrl("javascript:alert(1)"), null);
  assert.equal(embedUrl("https://evil.example/phish"), null);
  assert.equal(embedUrl(""), null);
});

test("custom CSS cannot break out of the style tag or load code", () => {
  const dirty = `.a{color:red}</style><script>alert(1)</script>@import url(//evil.css);.b{background:url(javascript:x);width:expression(1)}`;
  const clean = sanitizeCss(dirty);
  assert.ok(clean.includes(".a{color:red}"));
  assert.ok(!/<\/?\s*(style|script)/i.test(clean));
  assert.ok(!/@import/i.test(clean));
  assert.ok(!/javascript\s*:/i.test(clean));
  assert.ok(!/expression\s*\(/i.test(clean));
  assert.ok(sanitizeCss("a".repeat(50000)).length <= 20000);
});

test("presets only set known, valid style keys", () => {
  for (const preset of presets) {
    assert.deepEqual(
      Object.keys(preset.props).sort(),
      [...styleKeys].sort(),
      preset.id
    );
    assert.doesNotThrow(
      () => applyOperation(emptyPage(), "update_page", { props: preset.props }),
      preset.id
    );
  }
  for (const k of styleKeys) assert.ok(k in rootFields, k);
});

test("font loader only requests fonts the app shell does not already have", () => {
  assert.equal(
    googleFontsUrl(["inter", "manrope", "instrument", "system"]),
    null
  );
  const url = googleFontsUrl(["fraunces", "dmsans", "inter"]);
  assert.ok(
    url?.includes("family=Fraunces") &&
      url.includes("family=DM+Sans") &&
      !url.includes("family=Inter")
  );
});

test("the AI sees the shared props, the page settings and every new block", () => {
  const cat = blockCatalog() as {
    commonBlockProps: Record<string, unknown>;
    pageSettings: Record<string, unknown>;
  };
  for (const k of commonKeys) assert.ok(k in cat.commonBlockProps, k);
  for (const k of [
    "radius",
    "headingFont",
    "animations",
    "customCss",
    "ogImage",
  ])
    assert.ok(k in cat.pageSettings, k);
  for (const name of Object.keys(blocks))
    assert.ok(SYSTEM_PROMPT.includes(`"${name}"`), name);
  assert.match(SYSTEM_PROMPT, /spaceTop/);
  assert.match(SYSTEM_PROMPT, /mediaSize/);
});

test("exact sizes: numbers within range or empty, anything else is refused", () => {
  const p = applyOperation(emptyPage(), "insert_block", {
    type: "Hero",
    props: {},
  }).page;
  const id = p.content[0].props.id;
  const ok = applyOperation(p, "update_block", {
    id,
    props: {
      mediaInset: 2.5,
      mediaInsetBottom: 0,
      widthPx: 960,
      spaceTopPx: 0,
      spaceBottomPx: 240,
    },
  }).page;
  assert.equal(ok.content[0].props.mediaInset, 2.5);
  assert.equal(
    ok.content[0].props.spaceTopPx,
    0,
    "0 is a real value, not auto"
  );
  const cleared = applyOperation(ok, "update_block", {
    id,
    props: { mediaInset: "" },
  }).page;
  assert.equal(cleared.content[0].props.mediaInset, "");
  for (const bad of [
    { mediaInset: 40 },
    { mediaInset: -1 },
    { widthPx: 100 },
    { spaceTopPx: 9999 },
    { mediaInset: "big" },
  ]) {
    assert.throws(
      () => applyOperation(p, "update_block", { id, props: bad }),
      OpError,
      JSON.stringify(bad)
    );
  }
  const img = applyOperation(emptyPage(), "insert_block", {
    type: "Image",
    props: { widthPct: 60, heightPx: 480 },
  }).page;
  assert.equal(img.content[0].props.widthPct, 60);
  assert.throws(
    () =>
      applyOperation(img, "update_block", {
        id: img.content[0].props.id,
        props: { widthPct: 5 },
      }),
    OpError
  );
});

test("new sizing fields are defaulted on old pages and described to the AI", () => {
  const filled = fillDefaults({
    root: { props: {} },
    content: [{ type: "Image", props: { id: "Image-1", image: "x" } }],
  });
  assert.equal(filled.content[0].props.widthPct, 100);
  assert.equal(filled.content[0].props.heightPx, "");
  assert.equal(filled.content[0].props.spaceTopPx, "");
  assert.match(SYSTEM_PROMPT, /mediaInset/);
  assert.match(SYSTEM_PROMPT, /spaceTopPx/);
  assert.match(SYSTEM_PROMPT, /widthPct/);
  const cat = JSON.stringify(blockCatalog());
  assert.ok(cat.includes("número de 0 a 30"));
});
