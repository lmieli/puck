"use client";

// Direct manipulation in the editor: when a block is selected, handles appear
// on its edges. Dragging a handle changes the very same props that the sidebar
// fields and the AI edit, so all three paths always agree. While dragging the
// block previews the new value (no store writes); on release the change is
// committed once, as a single undo step.

import { createUsePuck, registerOverlayPortal } from "@puckeditor/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const usePuck = createUsePuck();

export type Patch = Record<string, unknown>;

type Ctx = {
  selected: boolean;
  /** Preview a patch without saving it (null clears the preview). */
  live: (patch: Patch | null) => void;
  /** Save a patch as one undo step. */
  commit: (patch: Patch) => void;
};

const ResizeContext = createContext<Ctx | null>(null);
export const ResizeProvider = ResizeContext.Provider;
export const useResize = () => useContext(ResizeContext);

/** Selection + live preview + commit for one block (editor only). */
export function useEditingController(id: string) {
  const selected = usePuck((s) => s.selectedItem?.props.id === id);
  const getItemById = usePuck((s) => s.getItemById);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const dispatch = usePuck((s) => s.dispatch);
  const [live, setLive] = useState<Patch | null>(null);

  const commit = useCallback(
    (patch: Patch) => {
      const item = getItemById(id);
      const selector = getSelectorForId(id);
      if (item && selector) {
        // "replace" is what editing a sidebar field does: it keeps the block
        // selected and records exactly one undo step.
        dispatch({
          type: "replace",
          destinationIndex: selector.index,
          destinationZone: selector.zone,
          data: { ...item, props: { ...item.props, ...patch } },
        } as never);
      }
      setLive(null);
    },
    [dispatch, getItemById, getSelectorForId, id]
  );

  return { selected, live, setLive, commit };
}

/* ------------------------------------------------------------------ */
/* One draggable handle                                                 */
/* ------------------------------------------------------------------ */

type Edge = "top" | "bottom" | "left" | "right";

export function DragHandle({
  edge,
  label,
  start,
  compute,
  className = "",
  style,
}: {
  edge: Edge;
  label: string;
  /** Current value, measured when the drag starts. */
  start: () => number;
  /** New patch (and a short text for the tooltip) for a pointer delta in px. */
  compute: (start: number, delta: number) => { patch: Patch; text: string };
  className?: string;
  style?: CSSProperties;
}) {
  const ctx = useResize();
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const selected = !!ctx?.selected;

  // The preview iframe is scaled by the editor's zoom; keep handles a constant size.
  const measureZoom = useCallback(() => {
    const fe = ref.current?.ownerDocument.defaultView
      ?.frameElement as HTMLElement | null;
    const z =
      fe && fe.offsetWidth
        ? fe.getBoundingClientRect().width / fe.offsetWidth
        : 1;
    setScale(z > 0 ? Math.round((1 / z) * 100) / 100 : 1);
  }, []);
  useEffect(() => {
    if (selected) measureZoom();
  }, [selected, measureZoom]);

  // Let pointer events through Puck's selection layer.
  useEffect(() => {
    const el = ref.current;
    return el ? registerOverlayPortal(el) : undefined;
  }, [selected]);

  if (!ctx || !selected) return null;
  const horizontal = edge === "left" || edge === "right";

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const from = start();
    const x0 = e.clientX;
    const y0 = e.clientY;
    let last: Patch | null = null;
    let raf = 0;

    // Listen on the window in the capture phase: the editor's own drag-and-drop
    // listeners would otherwise swallow the release before it reaches the handle.
    const win = el.ownerDocument.defaultView ?? window;
    const finish = (apply: boolean) => {
      win.removeEventListener("pointermove", move, true);
      win.removeEventListener("pointerup", up, true);
      win.removeEventListener("pointercancel", cancel, true);
      win.removeEventListener("keydown", key, true);
      cancelAnimationFrame(raf);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      setTip(null);
      // The click the browser fires after a drag would be read by the editor as
      // "clicked outside" and deselect the block: swallow it.
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      win.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => win.removeEventListener("click", swallow, true), 300);
      if (apply && last) ctx.commit(last);
      else ctx.live(null);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      ev.stopPropagation();
      const delta = horizontal ? ev.clientX - x0 : ev.clientY - y0;
      const r = compute(from, delta);
      last = r.patch;
      setTip(r.text);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ctx.live(r.patch));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      ev.stopPropagation();
      finish(true);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId) finish(false);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") finish(false);
    };
    win.addEventListener("pointermove", move, true);
    win.addEventListener("pointerup", up, true);
    win.addEventListener("pointercancel", cancel, true);
    win.addEventListener("keydown", key, true);
  };

  return (
    <div
      ref={ref}
      role="separator"
      aria-label={label}
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      tabIndex={-1}
      className={`vh-handle vh-${edge} ${
        tip ? "is-dragging" : ""
      } ${className}`}
      style={{ ...style, ["--vh-s" as string]: scale }}
      onPointerDown={onPointerDown}
      onPointerEnter={measureZoom}
      title={label}
    >
      <span className="vh-grip" />
      {tip && <span className="vh-tip">{tip}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spacing + width handles for ordinary (non-sticky) blocks             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

type Measure = {
  pt: number;
  pb: number;
  wl: number;
  ww: number;
  wrap: boolean;
};

export function BlockHandles({ withWidth = true }: { withWidth?: boolean }) {
  const ctx = useResize();
  const root = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Measure>({
    pt: 0,
    pb: 0,
    wl: 0,
    ww: 0,
    wrap: false,
  });

  const wrapper = () => root.current?.parentElement ?? null;
  const section = () => {
    const w = wrapper();
    return (w?.firstElementChild as HTMLElement | null) ?? null;
  };

   
  const measure = useCallback(() => {
    const w = wrapper();
    const sec = section();
    if (!w || !sec) return;
    const cs = getComputedStyle(sec);
    const wr = w.getBoundingClientRect();
    const wrapEl = sec.querySelector<HTMLElement>(".v-wrap");
    const rect = wrapEl?.getBoundingClientRect();
    const next: Measure = {
      pt: Math.round(parseFloat(cs.paddingTop) || 0),
      pb: Math.round(parseFloat(cs.paddingBottom) || 0),
      wl: rect ? Math.round(rect.left - wr.left) : 0,
      ww: rect ? Math.round(rect.width) : 0,
      wrap: !!rect,
    };
    setM((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (ctx?.selected) measure();
  });

  useEffect(() => {
    const w = wrapper();
    if (!w || !ctx?.selected) return;
    const win = w.ownerDocument.defaultView;
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    win?.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      win?.removeEventListener("resize", measure);
    };
  }, [ctx?.selected, measure]);

  if (!ctx?.selected) return <div ref={root} className="vh-layer" hidden />;

  const padStart = (side: "Top" | "Bottom") => () => {
    const sec = section();
    return sec ? parseFloat(getComputedStyle(sec)[`padding${side}`]) || 0 : 0;
  };
  const wrapStart = () =>
    section()?.querySelector<HTMLElement>(".v-wrap")?.getBoundingClientRect()
      .width ?? 1180;

  return (
    <div ref={root} className="vh-layer">
      <div className="vh-band vh-band-top" style={{ height: m.pt }} />
      <div className="vh-band vh-band-bottom" style={{ height: m.pb }} />
      <DragHandle
        edge="top"
        label="Arraste para mudar o espaço acima"
        style={{ top: m.pt }}
        start={padStart("Top")}
        compute={(s, d) => {
          const v = Math.round(clamp(s + d, 0, 640));
          return { patch: { spaceTopPx: v }, text: `Espaço acima: ${v}px` };
        }}
      />
      <DragHandle
        edge="bottom"
        label="Arraste para mudar o espaço abaixo"
        style={{ bottom: 0 }}
        start={padStart("Bottom")}
        compute={(s, d) => {
          const v = Math.round(clamp(s + d, 0, 640));
          return { patch: { spaceBottomPx: v }, text: `Espaço abaixo: ${v}px` };
        }}
      />
      {withWidth && m.wrap && (
        <>
          <DragHandle
            edge="left"
            label="Arraste para mudar a largura do conteúdo"
            style={{ left: m.wl }}
            start={wrapStart}
            compute={(s, d) => {
              const v = Math.round(clamp(s - 2 * d, 320, 2000) / 10) * 10;
              return { patch: { widthPx: v }, text: `Largura: ${v}px` };
            }}
          />
          <DragHandle
            edge="right"
            label="Arraste para mudar a largura do conteúdo"
            style={{ left: m.wl + m.ww }}
            start={wrapStart}
            compute={(s, d) => {
              const v = Math.round(clamp(s + 2 * d, 320, 2000) / 10) * 10;
              return { patch: { widthPx: v }, text: `Largura: ${v}px` };
            }}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image block: resize the picture itself                               */
/* ------------------------------------------------------------------ */

export function ImageHandles({
  box,
}: {
  box: React.RefObject<HTMLElement | null>;
}) {
  const container = () => {
    const el = box.current?.closest<HTMLElement>(".v-wrap");
    if (!el) return 1;
    const cs = getComputedStyle(el);
    return (
      el.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight) || 1
    );
  };
  const width = () => box.current?.offsetWidth ?? 1;
  const pct = (px: number) =>
    Math.round(clamp((px / container()) * 100, 10, 100));
  return (
    <div className="vh-layer vh-layer-fill">
      <DragHandle
        edge="left"
        label="Arraste para mudar a largura da imagem"
        start={width}
        compute={(s, d) => {
          const v = pct(s - 2 * d);
          return { patch: { widthPct: v }, text: `Largura: ${v}%` };
        }}
      />
      <DragHandle
        edge="right"
        label="Arraste para mudar a largura da imagem"
        start={width}
        compute={(s, d) => {
          const v = pct(s + 2 * d);
          return { patch: { widthPct: v }, text: `Largura: ${v}%` };
        }}
      />
      <DragHandle
        edge="bottom"
        label="Arraste para mudar a altura da imagem"
        start={() =>
          box.current?.querySelector<HTMLElement>(".v-figure-media")
            ?.offsetHeight ?? 300
        }
        compute={(s, d) => {
          const v = Math.round(clamp(s + d, 120, 1600) / 10) * 10;
          return { patch: { heightPx: v }, text: `Altura: ${v}px` };
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cinematic hero: resize the photo card                                */
/* ------------------------------------------------------------------ */

export function HeroHandles({
  section,
}: {
  section: React.RefObject<HTMLElement | null>;
}) {
  const rects = () => {
    const sec = section.current;
    const stage = sec?.querySelector<HTMLElement>(".v-hero-sticky");
    const frame = sec?.querySelector<HTMLElement>(".v-hero-frame");
    if (!stage || !frame) return null;
    return {
      s: stage.getBoundingClientRect(),
      f: frame.getBoundingClientRect(),
    };
  };
  const pctOf = (px: number, total: number, max: number) =>
    Math.round(clamp((px / Math.max(1, total)) * 100, 0, max) * 2) / 2;

  return (
    <div className="vh-hero-layer">
      <DragHandle
        edge="left"
        label="Arraste para mudar a margem lateral da foto"
        className="vh-hero-left"
        start={() => {
          const r = rects();
          return r ? r.f.left - r.s.left : 0;
        }}
        compute={(s, d) => {
          const r = rects();
          const v = pctOf(s + d, r?.s.width ?? 1440, 30);
          return { patch: { mediaInset: v }, text: `Margem lateral: ${v}%` };
        }}
      />
      <DragHandle
        edge="right"
        label="Arraste para mudar a margem lateral da foto"
        className="vh-hero-right"
        start={() => {
          const r = rects();
          return r ? r.s.right - r.f.right : 0;
        }}
        compute={(s, d) => {
          const r = rects();
          const v = pctOf(s - d, r?.s.width ?? 1440, 30);
          return { patch: { mediaInset: v }, text: `Margem lateral: ${v}%` };
        }}
      />
      <DragHandle
        edge="bottom"
        label="Arraste para mudar a margem inferior da foto"
        className="vh-hero-bottom"
        start={() => {
          const r = rects();
          return r ? r.s.bottom - r.f.bottom : 0;
        }}
        compute={(s, d) => {
          const r = rects();
          const v = pctOf(s - d, r?.s.height ?? 900, 25);
          return {
            patch: { mediaInsetBottom: v },
            text: `Margem inferior: ${v}%`,
          };
        }}
      />
    </div>
  );
}
