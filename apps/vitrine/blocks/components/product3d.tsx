"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useScrollProgress } from "../motion";
import { anchor, type PropsOf } from "../ui";

type Scene = Awaited<
  ReturnType<typeof import("../three-scene").createProductScene>
>;

function readAccent(el: HTMLElement) {
  const v = el.ownerDocument.defaultView
    ?.getComputedStyle(el)
    .getPropertyValue("--accent")
    .trim();
  return v || "#0071e3";
}

export function Product3D(p: PropsOf<"Product3D">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const captionsRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const steps = p.steps;

  const section = useScrollProgress<HTMLElement>("sticky", (progress) => {
    sceneRef.current?.setProgress(progress);
    const root = captionsRef.current;
    if (!root) return;
    // Intro title for the first slice, then one caption per step.
    const slice = 1 / (steps.length + 1);
    const idx = Math.min(steps.length, Math.floor(progress / slice));
    root.querySelectorAll<HTMLElement>("[data-cap]").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.cap) === idx);
    });
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const el = section.current;
    if (!canvas || !el) return;
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    const win = el.ownerDocument.defaultView!;
    const dark =
      !!el.closest('[data-scene-dark="true"]') ||
      win.getComputedStyle(el).getPropertyValue("--scene-dark").trim() === "1";

    import("../three-scene")
      .then(({ createProductScene }) => {
        if (cancelled) return;
        try {
          const scene = createProductScene(canvas, {
            shape: p.shape,
            color: p.color,
            finish: p.finish,
            model: p.model,
            accent: readAccent(el),
            dark,
          });
          sceneRef.current = scene;
          const current = parseFloat(el.style.getPropertyValue("--p") || "0");
          scene.setProgress(current);
          io = new win.IntersectionObserver(([e]) =>
            e.isIntersecting ? scene.start() : scene.stop()
          );
          io.observe(el);
          ro = new ResizeObserver(() => scene.resize());
          ro.observe(canvas);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      io?.disconnect();
      ro?.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [p.shape, p.color, p.finish, p.model, section]);

  return (
    <section
      ref={section}
      className={`v-product3d v-tone-${p.tone}`}
      style={{ "--steps": steps.length + 1 } as CSSProperties}
      id={anchor(p.eyebrow) || undefined}
    >
      <div className="v-product3d-stage">
        {failed ? (
          <div
            className="v-product3d-fallback"
            role="img"
            aria-label={p.title}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="v-product3d-canvas"
            aria-label={`Modelo 3D: ${p.title}`}
            role="img"
          />
        )}
        <div ref={captionsRef} className="v-product3d-captions">
          <div data-cap={0} className="v-cap v-cap-intro is-active">
            {p.eyebrow && (
              <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>
            )}
            <h2 className="v-h2">{p.title}</h2>
          </div>
          {steps.map((s, i) => (
            <div
              key={i}
              data-cap={i + 1}
              className={`v-cap ${i % 2 ? "is-right" : ""}`}
            >
              <span className="v-cap-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="v-h3">{s.title}</h3>
              <p className="v-body">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="v-product3d-progress" aria-hidden>
          <span />
        </div>
      </div>
    </section>
  );
}
