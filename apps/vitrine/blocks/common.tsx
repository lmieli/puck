"use client";

import type { CSSProperties, ReactNode } from "react";
import { anchor } from "./ui";

// Every block is wrapped once so spacing, background, width, text colour,
// entrance animation and responsive visibility work on all of them without
// each block knowing about it.

/** Blocks built on a tall sticky stage: spacing is added around them. */
const STICKY = new Set(["Product3D", "HorizontalScroll"]);

const sectionPad: Record<string, string> = {
  none: "0px",
  sm: "clamp(32px, 4vw, 56px)",
  lg: "clamp(112px, 14vw, 208px)",
  xl: "clamp(168px, 20vw, 296px)",
};

const stickyPad: Record<string, string> = {
  sm: "clamp(32px, 4vw, 56px)",
  lg: "clamp(112px, 14vw, 208px)",
  xl: "clamp(168px, 20vw, 296px)",
};

const widths: Record<string, string> = {
  narrow: "860px",
  normal: "1180px",
  wide: "1440px",
  full: "100%",
};

const reveals: Record<string, string> = {
  rise: "translate3d(0, 36px, 0) scale(0.985)",
  fade: "none",
  zoom: "scale(0.92)",
  slide: "translate3d(-56px, 0, 0)",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Only http(s) and same-site paths may be used as a CSS background. */
function safeUrl(src: unknown) {
  if (typeof src !== "string") return null;
  const v = src.trim();
  if (!v || !(v.startsWith("/") || /^https?:\/\//i.test(v))) return null;
  return `url(${JSON.stringify(v)})`;
}

type Common = {
  spaceTop?: string;
  spaceBottom?: string;
  width?: string;
  textAlign?: string;
  bgColor?: string;
  textColor?: string;
  bgImage?: string;
  bgOverlay?: string;
  animation?: string;
  hideOn?: string;
  anchor?: string;
  variant?: string;
  puck?: { isEditing?: boolean };
};

export function withCommon(type: string, render: (props: any) => ReactNode) {
  const sticky = STICKY.has(type);

  return function Block(props: Common & Record<string, unknown>) {
    const p = props;
    const stickyHere = sticky || (type === "Hero" && p.variant === "cinematic");
    const style: Record<string, string> = {};

    const top = p.spaceTop ?? "auto";
    const bottom = p.spaceBottom ?? "auto";
    if (stickyHere) {
      if (stickyPad[top]) style.paddingTop = stickyPad[top];
      if (stickyPad[bottom]) style.paddingBottom = stickyPad[bottom];
    } else {
      if (sectionPad[top]) style["--pt"] = sectionPad[top];
      if (sectionPad[bottom]) style["--pb"] = sectionPad[bottom];
    }

    if (p.width && widths[p.width]) style["--wrap"] = widths[p.width];

    const cbg = p.bgColor && HEX.test(p.bgColor) ? p.bgColor : null;
    const ctext = p.textColor && HEX.test(p.textColor) ? p.textColor : null;
    if (cbg) style["--cbg"] = cbg;
    if (ctext) style["--ctext"] = ctext;

    const bgimg = safeUrl(p.bgImage);
    if (bgimg) style["--bgimg"] = bgimg;
    const overlay = bgimg ? p.bgOverlay ?? "soft" : "none";

    const anim = p.animation ?? "auto";
    if (reveals[anim]) style["--reveal-from"] = reveals[anim];

    const id = p.anchor ? anchor(p.anchor) : undefined;
    const editing = !!p.puck?.isEditing;

    return (
      <div
        id={id || undefined}
        className={`v-block${overlay !== "none" ? " v-onimage" : ""}`}
        style={style as CSSProperties}
        data-type={type}
        data-cbg={cbg ? "" : undefined}
        data-ctext={ctext ? "" : undefined}
        data-bgimg={bgimg ? "" : undefined}
        data-overlay={overlay}
        data-anim={anim}
        data-align={
          p.textAlign && p.textAlign !== "auto" ? p.textAlign : undefined
        }
        data-hide={p.hideOn && p.hideOn !== "never" ? p.hideOn : undefined}
        data-editing={editing ? "" : undefined}
      >
        {render(props)}
      </div>
    );
  };
}
