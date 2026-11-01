"use client";

// Scroll-driven motion without libraries. Progress is written to a CSS custom
// property (--p) on the element inside requestAnimationFrame, so animations
// run on the compositor and React never re-renders while scrolling. The hooks
// use the element's own window, so they also work inside the editor iframe.

import { useEffect, useRef, type RefObject } from "react";

type Mode =
  /** 0 when the section top reaches the viewport top, 1 when its bottom reaches the viewport bottom (for sticky sections). */
  | "sticky"
  /** 0 when the element enters at the bottom, 1 when it leaves at the top. */
  | "travel";

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function prefersReducedMotion(win: Window | null) {
  return !!win?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function useScrollProgress<T extends HTMLElement>(
  mode: Mode,
  onProgress?: (p: number) => void
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const win = el.ownerDocument.defaultView;
    if (!win) return;
    let frame = 0;
    let last = -1;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = win.innerHeight;
      const p =
        mode === "sticky"
          ? clamp(-rect.top / Math.max(1, rect.height - vh))
          : clamp((vh - rect.top) / Math.max(1, vh + rect.height));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p);
    };
    const schedule = () => {
      if (!frame) frame = win.requestAnimationFrame(measure);
    };

    measure();
    win.addEventListener("scroll", schedule, { passive: true });
    win.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      win.removeEventListener("scroll", schedule);
      win.removeEventListener("resize", schedule);
      ro.disconnect();
      if (frame) win.cancelAnimationFrame(frame);
    };
  }, [mode]);

  return ref;
}

/** Adds `is-in` to children with [data-reveal] when they enter the viewport. */
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const win = root.ownerDocument.defaultView;
    const targets = root.matches("[data-reveal]")
      ? [root]
      : Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!win || !("IntersectionObserver" in win) || prefersReducedMotion(win)) {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    root.ownerDocument.documentElement.classList.add("v-motion");
    const io = new win.IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Index of the child [data-step] closest to the viewport centre. */
export function useActiveStep<T extends HTMLElement>(
  onChange: (i: number) => void
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const win = root.ownerDocument.defaultView;
    if (!win) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new win.IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting)
            cb.current(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return ref;
}
