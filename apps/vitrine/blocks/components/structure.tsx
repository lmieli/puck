"use client";

import { useEffect, useRef, useState } from "react";
import { Media, pairs, type PropsOf } from "../ui";

export function Nav(p: PropsOf<"Nav">) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const win = ref.current?.ownerDocument.defaultView;
    if (!win) return;
    const on = () => setScrolled(win.scrollY > 8);
    on();
    win.addEventListener("scroll", on, { passive: true });
    return () => win.removeEventListener("scroll", on);
  }, []);

  return (
    <nav
      ref={ref}
      className={`v-nav ${scrolled ? "is-scrolled" : ""} ${
        open ? "is-open" : ""
      }`}
      aria-label="Principal"
    >
      <div className="v-nav-inner">
        <a href="/" className="v-brand">
          {p.logo ? (
            <Media src={p.logo} alt={p.brand} className="v-brand-logo" eager />
          ) : (
            p.brand
          )}
        </a>
        <div className="v-nav-links">
          {p.links.map((l, i) => (
            <a key={i} href={l.href || "#"} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </div>
        {p.ctaLabel && (
          <a href={p.ctaHref || "#"} className="v-nav-cta">
            {p.ctaLabel}
          </a>
        )}
        {p.links.length > 0 && (
          <button
            type="button"
            className="v-nav-toggle"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        )}
      </div>
    </nav>
  );
}

export function Footer(p: PropsOf<"Footer">) {
  return (
    <footer className="v-section v-tone-subtle v-footer">
      <div className="v-wrap">
        <div className="v-footer-top">
          <div className="v-footer-brand">
            <strong>{p.brand}</strong>
            {p.tagline && <span>{p.tagline}</span>}
          </div>
          <div className="v-footer-cols">
            {p.columns.map((c, i) => (
              <div key={i}>
                <h3>{c.title}</h3>
                <ul>
                  {pairs(c.links, "|").map(([label, href], j) => (
                    <li key={j}>
                      <a href={href || "#"}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {p.legal && <p className="v-legal">{p.legal}</p>}
      </div>
    </footer>
  );
}

export function Space(p: PropsOf<"Space">) {
  return <div className={`v-space v-space-${p.size}`} aria-hidden />;
}
