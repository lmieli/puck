import type { CSSProperties, ReactNode } from "react";
import type { blocks, BlockName } from "./schema";

export type PropsOf<K extends BlockName> = (typeof blocks)[K]["defaults"] & {
  id?: string;
};

export type ButtonItem = { label: string; href: string; style?: string };

export function Buttons({
  items,
  center,
}: {
  items?: ButtonItem[];
  center?: boolean;
}) {
  const list = (items ?? []).filter((b) => b.label);
  if (!list.length) return null;
  return (
    <div className={`v-buttons ${center ? "is-center" : ""}`}>
      {list.map((b, i) => (
        <a
          key={i}
          href={b.href || "#"}
          className={`v-btn v-btn-${b.style || "primary"}`}
        >
          {b.label}
          {b.style === "link" && <span aria-hidden>&nbsp;›</span>}
        </a>
      ))}
    </div>
  );
}

/** An image, or an elegant accent-tinted gradient when no image is set. */
export function Media({
  src,
  alt = "",
  className = "",
  style,
  eager,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  if (!src)
    return (
      <div
        className={`v-placeholder ${className}`}
        style={style}
        role="img"
        aria-label={alt || "Imagem"}
      />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export function Section({
  tone = "auto",
  className = "",
  id,
  children,
  as: As = "section",
}: {
  tone?: string;
  className?: string;
  id?: string;
  children: ReactNode;
  as?: "section" | "div" | "header" | "footer";
}) {
  return (
    <As id={id} className={`v-section v-tone-${tone} ${className}`}>
      {children}
    </As>
  );
}

export function Head({
  eyebrow,
  title,
  intro,
  align = "center",
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  align?: "center" | "left";
}) {
  if (!eyebrow && !title && !intro) return null;
  return (
    <header className={`v-head v-head-${align}`} data-reveal>
      {eyebrow && <p className="v-eyebrow">{eyebrow}</p>}
      {title && <h2 className="v-h2">{title}</h2>}
      {intro && <p className="v-intro">{intro}</p>}
    </header>
  );
}

export function Paragraphs({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t, i) => (
          <p key={i}>{t}</p>
        ))}
    </>
  );
}

/** Lines in the "Label: value" or "Text | link" formats. */
export function pairs(text: string | undefined, sep: string) {
  return (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(sep);
      return i < 0
        ? [l, ""]
        : [l.slice(0, i).trim(), l.slice(i + sep.length).trim()];
    });
}

export const anchor = (s?: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
