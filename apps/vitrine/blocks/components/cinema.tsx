"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useActiveStep, useReveal, useScrollProgress } from "../motion";
import { anchor, Buttons, Head, Media, Section, type PropsOf } from "../ui";

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

function HeroMedia({
  image,
  video,
  title,
}: {
  image: string;
  video: string;
  title: string;
}) {
  if (video) {
    return (
      <video
        className="v-hero-img"
        src={video}
        poster={image || undefined}
        autoPlay
        muted
        loop
        playsInline
        aria-label={title}
      />
    );
  }
  return <Media src={image} alt={title} className="v-hero-img" eager />;
}

export function Hero(p: PropsOf<"Hero">) {
  const sticky = useScrollProgress<HTMLElement>("sticky");
  const reveal = useReveal<HTMLElement>();

  // The media card starts just below the headline: measure the copy so long
  // titles or large display fonts never overlap the image.
  useEffect(() => {
    const el = sticky.current;
    const copy = el?.querySelector<HTMLElement>(".v-hero-copy");
    const win = el?.ownerDocument.defaultView;
    if (!el || !copy || !win) return;
    const measure = () => {
      const share = Math.min(
        0.72,
        (copy.offsetHeight + 28) / Math.max(1, win.innerHeight)
      );
      el.style.setProperty("--copy-share", `${(share * 100).toFixed(2)}%`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(copy);
    win.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      win.removeEventListener("resize", measure);
    };
  }, [sticky, p.variant]);

  if (p.variant === "cinematic") {
    return (
      <section
        ref={sticky}
        className={`v-hero v-hero-cinematic v-tone-${p.tone}`}
      >
        <div className="v-hero-sticky">
          <div className="v-hero-copy">
            {p.eyebrow && (
              <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>
            )}
            <h1 className="v-display">{p.title}</h1>
            {p.subtitle && <p className="v-lead">{p.subtitle}</p>}
            <Buttons items={p.buttons} center />
          </div>
          <div className="v-hero-frame">
            <HeroMedia image={p.image} video={p.video} title={p.title} />
          </div>
        </div>
      </section>
    );
  }

  if (p.variant === "split") {
    return (
      <Section tone={p.tone} className="v-hero v-hero-split">
        <div
          ref={reveal as React.RefObject<HTMLDivElement>}
          className="v-wrap v-hero-split-grid"
        >
          <div className="v-hero-copy-left" data-reveal>
            {p.eyebrow && (
              <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>
            )}
            <h1 className="v-display">{p.title}</h1>
            {p.subtitle && <p className="v-lead">{p.subtitle}</p>}
            <Buttons items={p.buttons} />
          </div>
          <div className="v-hero-split-media" data-reveal>
            <HeroMedia image={p.image} video={p.video} title={p.title} />
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section tone={p.tone} className="v-hero v-hero-minimal">
      <div
        ref={reveal as React.RefObject<HTMLDivElement>}
        className="v-wrap v-narrow"
        data-reveal
      >
        {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
        <h1 className="v-display">{p.title}</h1>
        {p.subtitle && <p className="v-lead">{p.subtitle}</p>}
        <Buttons items={p.buttons} center />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* StickyStory                                                          */
/* ------------------------------------------------------------------ */

export function StickyStory(p: PropsOf<"StickyStory">) {
  const [active, setActive] = useState(0);
  const steps = useActiveStep<HTMLDivElement>(setActive);
  const chapters = p.chapters;
  return (
    <Section
      tone={p.tone}
      className="v-story"
      id={anchor(p.eyebrow) || undefined}
    >
      <div className="v-wrap">
        <Head eyebrow={p.eyebrow} title={p.title} />
        <div
          ref={steps}
          key={chapters.length}
          className={`v-story-grid ${
            p.mediaSide === "right" ? "is-right" : ""
          }`}
        >
          <div className="v-story-media" aria-hidden>
            <div className="v-story-stack">
              {chapters.map((c, i) => (
                <Media
                  key={i}
                  src={c.image}
                  className={`v-story-img ${i === active ? "is-active" : ""}`}
                />
              ))}
            </div>
          </div>
          <div className="v-story-text">
            {chapters.map((c, i) => (
              <article
                key={i}
                data-step={i}
                className={`v-chapter ${i === active ? "is-active" : ""}`}
              >
                <Media src={c.image} alt={c.title} className="v-chapter-img" />
                {c.eyebrow && (
                  <p className="v-eyebrow v-accent-text">{c.eyebrow}</p>
                )}
                <h3 className="v-h3">{c.title}</h3>
                <p className="v-body">{c.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Parallax                                                             */
/* ------------------------------------------------------------------ */

const depth = { soft: 12, medium: 22, strong: 34 } as const;

export function Parallax(p: PropsOf<"Parallax">) {
  const ref = useScrollProgress<HTMLElement>("travel");
  return (
    <section
      ref={ref}
      className={`v-parallax v-parallax-${p.height}`}
      style={
        {
          "--depth": `${depth[p.intensity as keyof typeof depth] ?? 22}%`,
        } as CSSProperties
      }
    >
      <div className="v-parallax-layer">
        <Media src={p.image} alt="" className="v-parallax-img" />
      </div>
      <div className="v-parallax-shade" />
      <div className="v-parallax-copy v-wrap">
        {p.eyebrow && <p className="v-eyebrow">{p.eyebrow}</p>}
        <h2 className="v-display-2">{p.title}</h2>
        {p.text && <p className="v-lead">{p.text}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal                                                               */
/* ------------------------------------------------------------------ */

export function Reveal(p: PropsOf<"Reveal">) {
  const ref = useScrollProgress<HTMLElement>("travel");
  const highlights = (p.highlight || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const words = (p.text || "").split(/\s+/).filter(Boolean);
  // Mark words that belong to a highlighted phrase.
  const marked = new Set<number>();
  const lower = words.map((w) => w.toLowerCase().replace(/[.,;:!?]/g, ""));
  for (const h of highlights) {
    const parts = h.split(/\s+/);
    for (let i = 0; i <= lower.length - parts.length; i++) {
      if (
        parts.every((part, j) => lower[i + j] === part.replace(/[.,;:!?]/g, ""))
      ) {
        parts.forEach((_, j) => marked.add(i + j));
      }
    }
  }
  return (
    <section
      ref={ref}
      className={`v-section v-tone-${p.tone} v-reveal`}
      style={{ "--n": words.length } as CSSProperties}
    >
      <div className="v-wrap v-narrow-wide">
        {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
        <p className="v-reveal-text">
          {words.map((w, i) => (
            <span
              key={i}
              className={marked.has(i) ? "is-mark" : undefined}
              style={{ "--i": i } as CSSProperties}
            >
              {w}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* HorizontalScroll                                                     */
/* ------------------------------------------------------------------ */

export function HorizontalScroll(p: PropsOf<"HorizontalScroll">) {
  const ref = useScrollProgress<HTMLElement>("sticky");
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const win = el?.ownerDocument.defaultView;
    const track = el?.querySelector<HTMLElement>(".v-hscroll-track");
    if (!el || !win || !track) return;
    const measure = () =>
      setDist(Math.max(0, track.scrollWidth - win.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    win.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      win.removeEventListener("resize", measure);
    };
  }, [ref, p.items.length]);

  return (
    <section
      ref={ref}
      className={`v-hscroll v-tone-${p.tone}`}
      style={{ "--dist": `${dist}px` } as CSSProperties}
      id={anchor(p.eyebrow) || undefined}
    >
      <div className="v-hscroll-sticky">
        <div className="v-wrap v-hscroll-head">
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          {p.title && <h2 className="v-h2">{p.title}</h2>}
        </div>
        <div className="v-hscroll-track">
          {p.items.map((it, i) => (
            <figure key={i} className="v-hcard">
              <Media src={it.image} alt={it.title} className="v-hcard-img" />
              <figcaption>
                <strong>{it.title}</strong>
                {it.text && <span>{it.text}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
