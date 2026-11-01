"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, useReveal } from "../motion";
import {
  anchor,
  Buttons,
  Head,
  Media,
  Paragraphs,
  pairs,
  Section,
  type ButtonItem,
  type PropsOf,
} from "../ui";

export function Bento(p: PropsOf<"Bento">) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section
      tone={p.tone}
      className="v-bento"
      id={anchor(p.eyebrow) || undefined}
    >
      <div className="v-wrap" ref={ref}>
        <Head eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className="v-bento-grid">
          {p.tiles.map((t, i) => (
            <article
              key={i}
              data-reveal
              style={{ transitionDelay: `${(i % 4) * 70}ms` }}
              className={`v-tile v-tile-${t.size} v-tile-${t.style}`}
            >
              {t.style === "image" && (
                <Media src={t.image} alt={t.title} className="v-tile-bg" />
              )}
              <div className="v-tile-body">
                {t.stat && <p className="v-tile-stat">{t.stat}</p>}
                {t.title && <h3 className="v-tile-title">{t.title}</h3>}
                {t.text && <p className="v-tile-text">{t.text}</p>}
              </div>
              {t.style !== "image" && t.image && (
                <Media src={t.image} alt="" className="v-tile-img" />
              )}
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Feature(p: PropsOf<"Feature">) {
  const ref = useReveal<HTMLDivElement>();
  const bullets = p.bullets as { text: string }[];
  return (
    <Section
      tone={p.tone}
      className="v-feature"
      id={anchor(p.eyebrow) || undefined}
    >
      <div
        ref={ref}
        className={`v-wrap v-feature-grid ${p.reverse ? "is-reverse" : ""}`}
      >
        <div className="v-feature-copy" data-reveal>
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          <h2 className="v-h2">{p.title}</h2>
          <div className="v-prose">
            <Paragraphs text={p.text} />
          </div>
          {bullets.length > 0 && (
            <ul className="v-checks">
              {bullets.map((b, i) => (
                <li key={i}>{b.text}</li>
              ))}
            </ul>
          )}
          <Buttons items={p.buttons as ButtonItem[]} />
        </div>
        <div className="v-feature-media" data-reveal>
          <Media src={p.image} alt={p.title} className="v-feature-img" />
        </div>
      </div>
    </Section>
  );
}

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^([^\d-]*)(-?[\d.,]+)(.*)$/);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const win = el?.ownerDocument.defaultView;
    if (!el || !win || !match || prefersReducedMotion(win)) return;
    const [, pre, num, post] = match;
    const target = parseFloat(num.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(target) || /^\d{4}$/.test(num)) return; // keep years as they are
    const decimals = num.includes(",") ? num.split(",")[1].length : 0;
    let raf = 0;
    const io = new win.IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = win.performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(
          `${pre}${(target * eased).toLocaleString("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}${post}`
        );
        if (t < 1) raf = win.requestAnimationFrame(tick);
      };
      raf = win.requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      win.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => setShown(value), [value]);
  return <span ref={ref}>{shown}</span>;
}

export function Stats(p: PropsOf<"Stats">) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section tone={p.tone} className="v-stats">
      <div className="v-wrap" ref={ref}>
        <Head eyebrow={p.eyebrow} title={p.title} />
        <dl
          className="v-stats-grid"
          style={{ ["--cols" as string]: Math.max(1, p.items.length) }}
        >
          {p.items.map((s, i) => (
            <div key={i} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <dt>
                <CountUp value={s.value} />
              </dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

export function Specs(p: PropsOf<"Specs">) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section tone={p.tone} className="v-specs" id="specs">
      <div className="v-wrap" ref={ref}>
        <Head title={p.title} />
        <div className="v-specs-list">
          {p.groups.map((g, i) => (
            <div key={i} className="v-spec-group" data-reveal>
              <h3>{g.name}</h3>
              <dl>
                {pairs(g.rows, ":").map(([k, v], j) => (
                  <div key={j}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Gallery(p: PropsOf<"Gallery">) {
  const ref = useReveal<HTMLDivElement>();
  const [open, setOpen] = useState<number | null>(null);
  const list = p.images;
  useEffect(() => {
    if (open === null) return;
    const win = ref.current?.ownerDocument.defaultView;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight")
        setOpen((o) => (o === null ? o : (o + 1) % list.length));
      if (e.key === "ArrowLeft")
        setOpen((o) => (o === null ? o : (o - 1 + list.length) % list.length));
    };
    win?.addEventListener("keydown", onKey);
    return () => win?.removeEventListener("keydown", onKey);
  }, [open, list.length, ref]);

  return (
    <Section
      tone={p.tone}
      className="v-gallery"
      id={anchor(p.eyebrow) || undefined}
    >
      <div className="v-wrap" ref={ref}>
        <Head eyebrow={p.eyebrow} title={p.title} />
        <div className={`v-gallery-grid v-cols-${p.columns}`}>
          {list.map((g, i) => (
            <button
              key={i}
              type="button"
              className="v-gallery-item"
              data-reveal
              onClick={() => g.src && setOpen(i)}
            >
              <Media src={g.src} alt={g.caption} />
              {g.caption && <span>{g.caption}</span>}
            </button>
          ))}
        </div>
      </div>
      {open !== null && list[open] && (
        <div
          className="v-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          onClick={() => setOpen(null)}
        >
          <figure onClick={(e) => e.stopPropagation()}>
            <Media src={list[open].src} alt={list[open].caption} eager />
            <figcaption>
              {list[open].caption}
              <span>
                {open + 1} / {list.length}
              </span>
            </figcaption>
          </figure>
          <button
            type="button"
            className="v-lightbox-close"
            aria-label="Fechar"
            onClick={() => setOpen(null)}
          >
            ×
          </button>
        </div>
      )}
    </Section>
  );
}

export function Quotes(p: PropsOf<"Quotes">) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section tone={p.tone} className="v-quotes">
      <div className="v-wrap" ref={ref}>
        <Head title={p.title} />
        <div className="v-quotes-grid">
          {p.items.map((q, i) => (
            <figure
              key={i}
              className="v-quote"
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <blockquote>“{q.quote}”</blockquote>
              <figcaption>
                <strong>{q.author}</strong>
                {q.role && <span>{q.role}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Faq(p: PropsOf<"Faq">) {
  return (
    <Section tone={p.tone} className="v-faq" id="faq">
      <div className="v-wrap v-narrow-wide">
        <Head title={p.title} />
        <div className="v-faq-list">
          {p.items.map((q, i) => (
            <details key={i}>
              <summary>{q.question}</summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
