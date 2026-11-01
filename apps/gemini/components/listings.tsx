"use client";

import type { ComponentConfig } from "@puckeditor/core";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  headFields,
  Icon,
  iconField,
  IconName,
  Section,
  SectionHead,
  Tone,
  toneField,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Properties – cards for developments on sale                         */
/* ------------------------------------------------------------------ */

export type PropertiesProps = {
  eyebrow: string;
  title: string;
  intro: string;
  items: {
    image: string;
    status: string;
    title: string;
    kind: string;
    location: string;
    specs: string;
    href: string;
  }[];
  tone: Tone;
};

export const Properties: ComponentConfig<PropertiesProps> = {
  label: "Imóveis à venda",
  fields: {
    ...headFields,
    items: {
      type: "array",
      label: "Imóveis",
      getItemSummary: (i) => i.title || "Imóvel",
      defaultItemProps: {
        image: "",
        status: "Lançamento",
        title: "Novo empreendimento",
        kind: "Residencial",
        location: "Nova Friburgo – RJ",
        specs: "2 e 3 quartos",
        href: "/",
      },
      arrayFields: {
        image: { type: "text", label: "Imagem (URL)" },
        status: { type: "text", label: "Etiqueta (ex.: Últimas unidades)" },
        title: { type: "text", label: "Nome" },
        kind: { type: "text", label: "Tipo" },
        location: { type: "text", label: "Localização" },
        specs: { type: "text", label: "Resumo (separe com ·)" },
        href: { type: "text", label: "Link" },
      },
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Imóveis à venda",
    title: "Encontre o seu próximo endereço",
    intro: "",
    items: [],
    tone: "light",
  },
  render: ({ eyebrow, title, intro, items, tone }) => (
    <Section tone={tone} id="imoveis">
      <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
      <div className="g-properties">
        {items.map((p, i) => (
          <a key={i} href={p.href} className="g-property">
            <div className="g-property-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image && <img src={p.image} alt={p.title} loading="lazy" />}
              {p.status && <span className="g-tag">{p.status}</span>}
            </div>
            <div className="g-property-body">
              <span className="g-property-kind">{p.kind}</span>
              <h3>{p.title}</h3>
              <p className="g-property-loc">
                <MapPin size={16} aria-hidden /> {p.location}
              </p>
              {p.specs && (
                <ul className="g-property-specs">
                  {p.specs.split("·").map((s) => (
                    <li key={s}>{s.trim()}</li>
                  ))}
                </ul>
              )}
              <span className="g-property-link">
                Conhecer empreendimento <ArrowRight size={16} aria-hidden />
              </span>
            </div>
          </a>
        ))}
      </div>
    </Section>
  ),
};

/* ------------------------------------------------------------------ */
/* Gallery with lightbox                                              */
/* ------------------------------------------------------------------ */

export type GalleryProps = {
  eyebrow: string;
  title: string;
  intro: string;
  images: { src: string; caption: string }[];
  layout: "mosaic" | "grid" | "plans";
  note: string;
  tone: Tone;
};

function GalleryView({
  eyebrow,
  title,
  intro,
  images,
  layout,
  note,
  tone,
}: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  const list = images.filter((i) => i.src);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight")
        setOpen((o) => (o === null ? o : (o + 1) % list.length));
      if (e.key === "ArrowLeft")
        setOpen((o) => (o === null ? o : (o - 1 + list.length) % list.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list.length]);

  return (
    <Section tone={tone} id={layout === "plans" ? "plantas" : undefined}>
      <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
      <div className={`g-gallery g-gallery-${layout}`}>
        {list.map((img, i) => (
          <button
            key={i}
            type="button"
            className="g-gallery-item"
            onClick={() => setOpen(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.caption || ""} loading="lazy" />
            {img.caption && (
              <span className="g-gallery-caption">{img.caption}</span>
            )}
            <span className="g-gallery-zoom">
              <Maximize2 size={18} aria-hidden />
            </span>
          </button>
        ))}
      </div>
      {note && <p className="g-note">{note}</p>}
      {open !== null && list[open] && (
        <div
          className="g-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            className="g-lightbox-close"
            aria-label="Fechar"
          >
            <X size={28} />
          </button>
          <button
            type="button"
            className="g-lightbox-nav is-prev"
            aria-label="Anterior"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open - 1 + list.length) % list.length);
            }}
          >
            <ChevronLeft size={32} />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={list[open].src} alt={list[open].caption || ""} />
            <figcaption>
              {list[open].caption}{" "}
              <span>
                {open + 1} / {list.length}
              </span>
            </figcaption>
          </figure>
          <button
            type="button"
            className="g-lightbox-nav is-next"
            aria-label="Próxima"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open + 1) % list.length);
            }}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </Section>
  );
}

export const Gallery: ComponentConfig<GalleryProps> = {
  label: "Galeria de fotos",
  fields: {
    ...headFields,
    images: {
      type: "array",
      label: "Fotos",
      getItemSummary: (i) => i.caption || "Foto",
      defaultItemProps: { src: "", caption: "" },
      arrayFields: {
        src: { type: "text", label: "Imagem (URL)" },
        caption: { type: "text", label: "Legenda" },
      },
    },
    layout: {
      type: "radio",
      label: "Disposição",
      options: [
        { label: "Mosaico", value: "mosaic" },
        { label: "Grade", value: "grid" },
        { label: "Plantas", value: "plans" },
      ],
    },
    note: { type: "textarea", label: "Observação (rodapé)" },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Galeria",
    title: "Conheça os ambientes",
    intro: "",
    images: [],
    layout: "mosaic",
    note: "",
    tone: "light",
  },
  render: (props) => <GalleryView {...props} />,
};

/* ------------------------------------------------------------------ */
/* Portfolio – completed works with category filter                    */
/* ------------------------------------------------------------------ */

export type PortfolioProps = {
  eyebrow: string;
  title: string;
  intro: string;
  items: { image: string; title: string; category: string; location: string }[];
  tone: Tone;
};

function PortfolioView({ eyebrow, title, intro, items, tone }: PortfolioProps) {
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
    [items]
  );
  const [filter, setFilter] = useState("Todas");
  const shown =
    filter === "Todas" ? items : items.filter((i) => i.category === filter);

  return (
    <Section tone={tone}>
      <div className="g-portfolio-head">
        <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
        {categories.length > 1 && (
          <div className="g-filter" role="tablist">
            {["Todas", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={filter === c}
                className={filter === c ? "is-active" : undefined}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="g-portfolio">
        {shown.map((p, i) => (
          <figure key={p.title + i} className="g-work">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image && <img src={p.image} alt={p.title} loading="lazy" />}
            <figcaption>
              <span>{p.category}</span>
              <strong>{p.title}</strong>
              <small>{p.location}</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export const Portfolio: ComponentConfig<PortfolioProps> = {
  label: "Obras realizadas",
  fields: {
    ...headFields,
    items: {
      type: "array",
      label: "Obras",
      getItemSummary: (i) => i.title || "Obra",
      defaultItemProps: {
        image: "",
        title: "Nova obra",
        category: "Residencial",
        location: "Nova Friburgo – RJ",
      },
      arrayFields: {
        image: { type: "text", label: "Imagem (URL)" },
        title: { type: "text", label: "Nome" },
        category: { type: "text", label: "Categoria (usada no filtro)" },
        location: { type: "text", label: "Local" },
      },
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Portfólio",
    title: "Obras realizadas",
    intro: "",
    items: [],
    tone: "light",
  },
  render: (props) => <PortfolioView {...props} />,
};

/* ------------------------------------------------------------------ */
/* Specs – unit types side by side                                      */
/* ------------------------------------------------------------------ */

export type SpecsProps = {
  eyebrow: string;
  title: string;
  intro: string;
  units: {
    image: string;
    name: string;
    subtitle: string;
    rows: string;
  }[];
  finishes: { icon: IconName; label: string; value: string }[];
  tone: Tone;
};

export const Specs: ComponentConfig<SpecsProps> = {
  label: "Ficha técnica",
  fields: {
    ...headFields,
    units: {
      type: "array",
      label: "Tipos de unidade",
      getItemSummary: (i) => i.name || "Unidade",
      defaultItemProps: {
        image: "",
        name: "2 quartos",
        subtitle: "",
        rows: "Área: 70 m²\nVagas: 1",
      },
      arrayFields: {
        image: { type: "text", label: "Planta (URL)" },
        name: { type: "text", label: "Nome" },
        subtitle: { type: "text", label: "Subtítulo" },
        rows: {
          type: "textarea",
          label: "Dados (um por linha, no formato Rótulo: valor)",
        },
      },
    },
    finishes: {
      type: "array",
      label: "Acabamentos",
      getItemSummary: (i) => i.label || "Acabamento",
      defaultItemProps: { icon: "check", label: "Item", value: "" },
      arrayFields: {
        icon: iconField,
        label: { type: "text", label: "Ambiente" },
        value: { type: "text", label: "Acabamento" },
      },
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Ficha técnica",
    title: "Plantas e acabamentos",
    intro: "",
    units: [],
    finishes: [],
    tone: "sand",
  },
  render: ({ eyebrow, title, intro, units, finishes, tone }) => (
    <Section tone={tone} id="ficha">
      <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
      <div className="g-units">
        {units.map((u, i) => (
          <article key={i} className="g-unit">
            {u.image && (
              <div className="g-unit-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.image} alt={`Planta ${u.name}`} loading="lazy" />
              </div>
            )}
            <div className="g-unit-body">
              <h3>{u.name}</h3>
              {u.subtitle && <p className="g-unit-sub">{u.subtitle}</p>}
              <dl>
                {u.rows
                  .split("\n")
                  .filter((r) => r.trim())
                  .map((r, j) => {
                    const [k, ...v] = r.split(":");
                    return (
                      <div key={j}>
                        <dt>{k.trim()}</dt>
                        <dd>{v.join(":").trim()}</dd>
                      </div>
                    );
                  })}
              </dl>
            </div>
          </article>
        ))}
      </div>
      {finishes.length > 0 && (
        <div className="g-finishes">
          <h3>Acabamentos</h3>
          <ul>
            {finishes.map((f, i) => (
              <li key={i}>
                <Icon name={f.icon} size={20} />
                <span>
                  <strong>{f.label}</strong>
                  {f.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  ),
};

/* ------------------------------------------------------------------ */
/* Progress – construction stages                                       */
/* ------------------------------------------------------------------ */

export type ProgressProps = {
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  updated: string;
  stages: { title: string; text: string; percent: number }[];
  tone: Tone;
};

export const Progress: ComponentConfig<ProgressProps> = {
  label: "Andamento da obra",
  fields: {
    ...headFields,
    image: { type: "text", label: "Foto da obra (URL)" },
    updated: { type: "text", label: "Atualizado em" },
    stages: {
      type: "array",
      label: "Etapas",
      getItemSummary: (i) => `${i.title} – ${i.percent}%`,
      defaultItemProps: { title: "Etapa", text: "", percent: 0 },
      arrayFields: {
        title: { type: "text", label: "Etapa" },
        text: { type: "textarea", label: "Descrição" },
        percent: { type: "number", label: "Progresso (%)", min: 0, max: 100 },
      },
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Andamento da obra",
    title: "Empreendimento",
    intro: "",
    image: "",
    updated: "",
    stages: [],
    tone: "light",
  },
  render: ({ eyebrow, title, intro, image, updated, stages, tone }) => {
    const total = stages.length
      ? Math.round(
          stages.reduce((s, st) => s + Number(st.percent || 0), 0) /
            stages.length
        )
      : 0;
    return (
      <Section tone={tone}>
        <div className="g-progress">
          <aside className="g-progress-summary">
            <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
            <div
              className="g-ring"
              style={{ ["--p" as string]: total }}
              role="img"
              aria-label={`Obra ${total}% concluída`}
            >
              <span>
                {total}%<small>{total === 100 ? "concluída" : "da obra"}</small>
              </span>
            </div>
            {updated && <p className="g-note">Atualizado em {updated}</p>}
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={`Obra do ${title}`}
                loading="lazy"
                className="g-progress-photo"
              />
            )}
          </aside>
          <ol className="g-stages">
            {stages.map((s, i) => {
              const p = Math.max(0, Math.min(100, Number(s.percent || 0)));
              const state = p >= 100 ? "done" : p > 0 ? "doing" : "todo";
              return (
                <li key={i} className={`is-${state}`}>
                  <div className="g-stage-top">
                    <span className="g-stage-num">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{s.title}</h3>
                    <strong>{p}%</strong>
                  </div>
                  {s.text && <p>{s.text}</p>}
                  <div className="g-bar">
                    <span style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Section>
    );
  },
};
