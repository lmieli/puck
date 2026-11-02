"use client";

import { FieldGroup, type Config, type Field } from "@puckeditor/core";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { withCommon } from "./common";
import { toPuckField } from "./fields";
import { fontPresets, fonts, googleFontsUrl, sanitizeCss } from "./design";
import {
  blocks,
  categories,
  commonKeys,
  defaultsFor,
  fieldsFor,
  rootDefaults,
  rootFields,
  rootGroups,
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
import { Contact, Cta, Signup } from "./components/conversion";
import {
  Cards,
  Divider,
  Embed,
  Image,
  Logos,
  Pricing,
  Text,
} from "./components/extra";

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
  Signup,
  Text,
  Image,
  Cards,
  Pricing,
  Logos,
  Embed,
  Divider,
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

const HEX = /^#[0-9a-fA-F]{6}$/;
const radii = {
  none: ["0px", "0px"],
  sm: ["14px", "6px"],
  md: ["28px", "10px"],
  lg: ["40px", "14px"],
  xl: ["56px", "18px"],
} as const;
const btnRadius = { pill: "999px", rounded: "14px", square: "0px" } as const;
const wraps = { narrow: "960px", normal: "1180px", wide: "1440px" } as const;
const space = { compact: 0.7, normal: 1, airy: 1.2 } as const;
const titleScales = { sm: 0.85, md: 1, lg: 1.18, xl: 1.4 } as const;

export function SiteFrame({
  root,
  children,
}: {
  root: Record<string, unknown>;
  children: ReactNode;
}) {
  const r = { ...rootDefaults, ...root } as typeof rootDefaults;
  const preset = fontPresets[r.font] ?? fontPresets.clean;
  const heading =
    r.headingFont !== "auto" && fonts[r.headingFont]
      ? r.headingFont
      : preset.heading;
  const body =
    r.bodyFont !== "auto" && fonts[r.bodyFont] ? r.bodyFont : preset.body;
  const [radius, radiusSm] = radii[r.radius as keyof typeof radii] ?? radii.md;
  const fontsUrl = googleFontsUrl([heading, body]);
  const css = sanitizeCss(r.customCss);

  const style: Record<string, string | number> = {
    "--accent": HEX.test(r.accent) ? r.accent : "#0071e3",
    "--on-accent": contrastOn(r.accent),
    "--font-display": fonts[heading].css,
    "--font-body": fonts[body].css,
    "--radius": radius,
    "--radius-sm": radiusSm,
    "--btn-radius":
      btnRadius[r.buttonShape as keyof typeof btnRadius] ?? "999px",
    "--wrap": wraps[r.contentWidth as keyof typeof wraps] ?? "1180px",
    "--space": space[r.density as keyof typeof space] ?? 1,
    "--ts": titleScales[r.titleScale as keyof typeof titleScales] ?? 1,
  };
  const serif = !!fonts[heading].serif;
  style["--fd-weight"] =
    r.headingWeight !== "auto"
      ? r.headingWeight
      : serif
      ? 400
      : heading === "manrope"
      ? 800
      : 700;
  style["--fd-track"] = serif
    ? "-0.02em"
    : heading === "manrope"
    ? "-0.04em"
    : "-0.035em";
  if (HEX.test(r.bgColor)) {
    style["--bg"] = r.bgColor;
    style["--bg-subtle"] = `color-mix(in srgb, ${r.bgColor} 94%, ${
      HEX.test(r.textColor) ? r.textColor : "#808080"
    })`;
  }
  if (HEX.test(r.textColor)) {
    style["--fg"] = r.textColor;
    style["--muted"] = `color-mix(in srgb, ${r.textColor} 62%, transparent)`;
    style["--line"] = `color-mix(in srgb, ${r.textColor} 18%, transparent)`;
  }

  return (
    <div
      className="v-site"
      data-theme={r.theme === "dark" || r.theme === "auto" ? r.theme : "light"}
      data-font={r.font}
      data-serif={serif ? "" : undefined}
      data-motion={r.animations === false ? "off" : "on"}
      style={style as CSSProperties}
    >
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {children}
    </div>
  );
}

/** Block fields first, then the shared style fields in a collapsed group. */
function renderBlockFields(contentKeys: string[]) {
  return function RenderFields({
    fields,
  }: {
    fields: Record<string, ReactNode>;
  }) {
    return (
      <>
        {contentKeys.map((k) => (
          <Fragment key={k}>{fields[k]}</Fragment>
        ))}
        <FieldGroup
          label="Estilo e espaçamento"
          collapsible
          defaultExpanded={false}
        >
          {commonKeys.map((k) => (
            <FieldGroup.Item key={k}>{fields[k]}</FieldGroup.Item>
          ))}
        </FieldGroup>
      </>
    );
  };
}

function RenderRootFields({ fields }: { fields: Record<string, ReactNode> }) {
  return (
    <>
      {rootGroups.map((g) => (
        <FieldGroup
          key={g.label}
          label={g.label}
          collapsible
          defaultExpanded={!!g.open}
        >
          {g.keys.map((k) => (
            <FieldGroup.Item key={k}>{fields[k]}</FieldGroup.Item>
          ))}
        </FieldGroup>
      ))}
    </>
  );
}

const components = Object.fromEntries(
  (Object.keys(blocks) as BlockName[]).map((name) => {
    const def = blocks[name];
    const contentKeys = Object.keys(def.fields);
    return [
      name,
      {
        label: def.label,
        fields: fieldsOf(fieldsFor(name)),
        defaultProps: defaultsFor(name),
        render: withCommon(name, renders[name]),
        renderFields: renderBlockFields(contentKeys),
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
    renderFields: RenderRootFields,
    render: ({
      children,
      ...props
    }: { children: ReactNode } & Record<string, unknown>) => (
      <SiteFrame root={props}>{children}</SiteFrame>
    ),
  },
} as unknown as Config;
