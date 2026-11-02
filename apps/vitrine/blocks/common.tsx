"use client";

import type { CSSProperties, ReactNode } from "react";
import { anchor } from "./ui";
import { BlockHandles, ResizeProvider, useEditingController } from "./resize";

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
  id?: string;
  spaceTop?: string;
  spaceBottom?: string;
  spaceTopPx?: number | "";
  spaceBottomPx?: number | "";
  width?: string;
  widthPx?: number | "";
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

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Blocks that never get spacing/width handles (fixed, or own sticky stage). */
const NO_HANDLES = new Set(["Nav", "Product3D", "HorizontalScroll"]);

function BlockView({
  type,
  p,
  render,
  editing,
  children,
}: {
  type: string;
  p: Common & Record<string, unknown>;
  render: (props: any) => ReactNode;
  editing: boolean;
  children?: ReactNode;
}) {
  const stickyHere =
    STICKY.has(type) || (type === "Hero" && p.variant === "cinematic");
  const style: Record<string, string> = {};

  const topPx = num(p.spaceTopPx);
  const bottomPx = num(p.spaceBottomPx);
  const top = p.spaceTop ?? "auto";
  const bottom = p.spaceBottom ?? "auto";
  if (stickyHere) {
    if (topPx !== null) style.paddingTop = `${topPx}px`;
    else if (stickyPad[top]) style.paddingTop = stickyPad[top];
    if (bottomPx !== null) style.paddingBottom = `${bottomPx}px`;
    else if (stickyPad[bottom]) style.paddingBottom = stickyPad[bottom];
  } else {
    if (topPx !== null) style["--pt"] = `${topPx}px`;
    else if (sectionPad[top]) style["--pt"] = sectionPad[top];
    if (bottomPx !== null) style["--pb"] = `${bottomPx}px`;
    else if (sectionPad[bottom]) style["--pb"] = sectionPad[bottom];
  }

  const widthPx = num(p.widthPx);
  if (widthPx !== null && widthPx > 0) style["--wrap"] = `${widthPx}px`;
  else if (p.width && widths[p.width]) style["--wrap"] = widths[p.width];

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
      {render(p)}
      {children}
    </div>
  );
}

export function withCommon(type: string, render: (props: any) => ReactNode) {
  const sticky = STICKY.has(type);

  /** In the editor: live preview while dragging + handles on the selection. */
  function EditableBlock(props: Common & Record<string, unknown>) {
    const ctl = useEditingController(String(props.id));
    const merged = ctl.live ? { ...props, ...ctl.live } : props;
    const stickyHere =
      sticky || (type === "Hero" && merged.variant === "cinematic");
    return (
      <ResizeProvider
        value={{
          selected: ctl.selected,
          live: ctl.setLive,
          commit: ctl.commit,
        }}
      >
        <BlockView type={type} p={merged} render={render} editing>
          {!stickyHere && !NO_HANDLES.has(type) && (
            <BlockHandles withWidth={type !== "Image"} />
          )}
        </BlockView>
      </ResizeProvider>
    );
  }

  return function Block(props: Common & Record<string, unknown>) {
    return props.puck?.isEditing ? (
      <EditableBlock {...props} />
    ) : (
      <BlockView type={type} p={props} render={render} editing={false} />
    );
  };
}
