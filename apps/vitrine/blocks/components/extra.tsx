"use client";

import { embedUrl } from "../design";
import { useRef } from "react";
import { useReveal } from "../motion";
import { ImageHandles, useResize } from "../resize";
import {
  anchor,
  Buttons,
  Head,
  lines,
  Media,
  objectPositions,
  Paragraphs,
  Section,
  type ButtonItem,
  type PropsOf,
} from "../ui";

const titleScale = { sm: 0.78, md: 1, lg: 1.25, xl: 1.55 } as const;
const cssRatio = (r: string) =>
  r === "auto" ? undefined : r.replace("/", " / ");

export function Text(p: PropsOf<"Text">) {
  const ref = useReveal<HTMLDivElement>();
  const scale = titleScale[p.size as keyof typeof titleScale] ?? 1;
  return (
    <Section tone={p.tone} className="v-text">
      <div ref={ref} className={`v-wrap v-narrow-wide v-text-${p.align}`}>
        <div data-reveal>
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          {p.title && (
            <h2
              className="v-h2 v-text-title"
              style={{ ["--ht" as string]: scale }}
            >
              {p.title}
            </h2>
          )}
          {p.body && (
            <div className="v-prose v-text-body">
              <Paragraphs text={p.body} />
            </div>
          )}
          <Buttons
            items={p.buttons as ButtonItem[]}
            center={p.align === "center"}
          />
        </div>
      </div>
    </Section>
  );
}

export function Image(p: PropsOf<"Image">) {
  const ref = useReveal<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const resize = useResize();
  const widthPct = typeof p.widthPct === "number" ? p.widthPct : 100;
  const heightPx = typeof p.heightPx === "number" ? p.heightPx : null;
  const media = (
    <div
      className="v-figure-media"
      style={{
        aspectRatio: heightPx ? undefined : cssRatio(p.ratio),
        height: heightPx ?? undefined,
      }}
    >
      <Media
        src={p.image}
        alt={p.alt}
        style={{
          objectFit: p.fit as "cover" | "contain",
          objectPosition: objectPositions[p.position],
        }}
      />
    </div>
  );
  return (
    <Section tone={p.tone} className="v-image">
      <div ref={ref} className="v-wrap">
        <figure
          className={`v-figure${p.rounded ? " is-rounded" : ""}`}
          style={{ width: `${widthPct}%` }}
          data-reveal
        >
          <div className="v-figure-box" ref={box}>
            {p.href ? <a href={p.href}>{media}</a> : media}
            {resize && <ImageHandles box={box} />}
          </div>
          {p.caption && <figcaption>{p.caption}</figcaption>}
        </figure>
      </div>
    </Section>
  );
}

export function Cards(p: PropsOf<"Cards">) {
  const ref = useReveal<HTMLDivElement>();
  const withMedia = p.items.some((c) => c.image);
  return (
    <Section
      tone={p.tone}
      className="v-cards"
      id={anchor(p.eyebrow) || undefined}
    >
      <div className="v-wrap" ref={ref}>
        <Head eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className={`v-cards-grid v-cols-${p.columns}`}>
          {p.items.map((c, i) => (
            <article
              key={i}
              data-reveal
              style={{ transitionDelay: `${(i % 4) * 70}ms` }}
              className={`v-card v-card-${p.cardStyle}`}
            >
              {withMedia && (
                <div
                  className="v-card-media"
                  style={{ aspectRatio: cssRatio(p.ratio) }}
                >
                  <Media src={c.image} alt={c.title} />
                </div>
              )}
              <div className="v-card-body">
                <h3 className="v-h3">{c.title}</h3>
                {c.text && <p className="v-body">{c.text}</p>}
                {c.href && c.linkLabel && (
                  <a className="v-card-link" href={c.href}>
                    {c.linkLabel}
                    <span aria-hidden>&nbsp;›</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Pricing(p: PropsOf<"Pricing">) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section
      tone={p.tone}
      className="v-pricing"
      id={anchor(p.eyebrow) || "planos"}
    >
      <div className="v-wrap" ref={ref}>
        <Head eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className="v-plans" style={{ ["--n" as string]: p.plans.length }}>
          {p.plans.map((pl, i) => (
            <article
              key={i}
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
              className={`v-plan${pl.highlight ? " is-highlight" : ""}`}
            >
              {pl.badge && <span className="v-plan-badge">{pl.badge}</span>}
              <h3 className="v-h3">{pl.name}</h3>
              {pl.description && <p className="v-body">{pl.description}</p>}
              <p className="v-plan-price">
                <strong>{pl.price}</strong>
                {pl.period && <span>{pl.period}</span>}
              </p>
              <ul className="v-checks">
                {lines(pl.features).map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
              {pl.buttonLabel && (
                <a
                  className={`v-btn ${
                    pl.highlight ? "v-btn-primary" : "v-btn-secondary"
                  }`}
                  href={pl.href || "#"}
                >
                  {pl.buttonLabel}
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Logos(p: PropsOf<"Logos">) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section tone={p.tone} className="v-logos">
      <div className="v-wrap" ref={ref}>
        {p.title && (
          <p className="v-logos-title" data-reveal>
            {p.title}
          </p>
        )}
        <ul
          className={`v-logos-row${p.grayscale ? " is-gray" : ""}`}
          data-reveal
        >
          {p.items.map((l, i) => {
            const inner = l.image ? (
              <Media src={l.image} alt={l.name} />
            ) : (
              <span>{l.name}</span>
            );
            return (
              <li key={i}>{l.href ? <a href={l.href}>{inner}</a> : inner}</li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

export function Embed(p: PropsOf<"Embed">) {
  const ref = useReveal<HTMLDivElement>();
  const src = embedUrl(p.url);
  return (
    <Section tone={p.tone} className="v-embed">
      <div className="v-wrap" ref={ref}>
        <Head eyebrow={p.eyebrow} title={p.title} />
        <div
          className="v-embed-box"
          style={{ aspectRatio: cssRatio(p.ratio) }}
          data-reveal
        >
          {src ? (
            <iframe
              src={src}
              title={p.title || "Conteúdo incorporado"}
              loading="lazy"
              allow="fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
            />
          ) : (
            <p className="v-embed-empty">
              {p.url
                ? "Este endereço não é aceito. Use um link do YouTube, Vimeo, Loom, Google Maps (incorporar), OpenStreetMap ou Calendly."
                : "Cole o link de um vídeo ou mapa no campo Endereço."}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

export function Divider(p: PropsOf<"Divider">) {
  return (
    <div className="v-divider-wrap">
      <hr
        className={`v-divider v-divider-${p.style}${
          p.narrow ? " is-narrow" : ""
        }`}
      />
    </div>
  );
}
