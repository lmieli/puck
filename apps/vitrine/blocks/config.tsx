"use client";

import type { Config, Field } from "@puckeditor/core";
import type { CSSProperties, ReactNode } from "react";
import { toPuckField } from "./fields";
import {
  blocks,
  categories,
  rootDefaults,
  rootFields,
  type BlockName,
  type Category,
  type FieldDef,
} from "./schema";
import { Footer, Nav, Space } from "./components/structure";
import {
  Hero,
  HorizontalScroll,
  Parallax,
  Reveal,
  StickyStory,
} from "./components/cinema";
import { Product3D } from "./components/product3d";
import {
  Bento,
  Faq,
  Feature,
  Gallery,
  Quotes,
  Specs,
  Stats,
} from "./components/content";
import { Contact, Cta } from "./components/conversion";

const renders: Record<BlockName, (props: any) => ReactNode> = {
  Nav,
  Hero,
  Product3D,
  StickyStory,
  Parallax,
  Reveal,
  HorizontalScroll,
  Bento,
  Feature,
  Stats,
  Specs,
  Gallery,
  Quotes,
  Faq,
  Cta,
  Contact,
  Space,
  Footer,
};

function fieldsOf(defs: Record<string, FieldDef>) {
  const out: Record<string, Field> = {};
  for (const [k, f] of Object.entries(defs)) out[k] = toPuckField(f);
  return out;
}

/** Readable text colour on top of the accent colour. */
export function contrastOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#111111" : "#ffffff";
}

export function SiteFrame({
  root,
  children,
}: {
  root: Record<string, unknown>;
  children: ReactNode;
}) {
  const r = { ...rootDefaults, ...root } as typeof rootDefaults;
  return (
    <div
      className="v-site"
      data-theme={r.theme === "dark" ? "dark" : "light"}
      data-font={r.font}
      style={
        {
          "--accent": r.accent,
          "--on-accent": contrastOn(r.accent),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

const components = Object.fromEntries(
  (Object.keys(blocks) as BlockName[]).map((name) => {
    const def = blocks[name];
    return [
      name,
      {
        label: def.label,
        fields: fieldsOf(def.fields as Record<string, FieldDef>),
        defaultProps: JSON.parse(JSON.stringify(def.defaults)),
        render: renders[name],
      },
    ];
  })
);

const cats = Object.fromEntries(
  (Object.keys(categories) as Category[]).map((c) => [
    c,
    {
      title: categories[c],
      components: (Object.keys(blocks) as BlockName[]).filter(
        (n) => blocks[n].category === c
      ),
    },
  ])
);

export const config = {
  categories: cats,
  components,
  root: {
    fields: fieldsOf(rootFields as Record<string, FieldDef>),
    defaultProps: rootDefaults,
    render: ({
      children,
      ...props
    }: { children: ReactNode } & Record<string, unknown>) => (
      <SiteFrame root={props}>{children}</SiteFrame>
    ),
  },
} as unknown as Config;
