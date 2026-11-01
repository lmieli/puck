import type { ComponentConfig } from "@puckeditor/core";
import {
  Buttons,
  buttonsField,
  ButtonItem,
  Icon,
  iconField,
  IconName,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Hero – full-bleed image with headline, badges and actions           */
/* ------------------------------------------------------------------ */

export type HeroProps = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  buttons: ButtonItem[];
  highlights: { icon: IconName; label: string }[];
  badge: string;
  height: "tall" | "medium";
  align: "left" | "center";
};

export const Hero: ComponentConfig<HeroProps> = {
  label: "Destaque (topo)",
  fields: {
    image: { type: "text", label: "Imagem de fundo (URL)" },
    eyebrow: { type: "text", label: "Chamada" },
    title: { type: "textarea", label: "Título" },
    description: { type: "textarea", label: "Descrição" },
    buttons: buttonsField,
    highlights: {
      type: "array",
      label: "Destaques",
      getItemSummary: (i) => i.label || "Destaque",
      defaultItemProps: { icon: "check", label: "Novo destaque" },
      arrayFields: { icon: iconField, label: { type: "text", label: "Texto" } },
    },
    badge: { type: "text", label: "Selo (canto)" },
    height: {
      type: "radio",
      label: "Altura",
      options: [
        { label: "Tela cheia", value: "tall" },
        { label: "Média", value: "medium" },
      ],
    },
    align: {
      type: "radio",
      label: "Alinhamento",
      options: [
        { label: "Esquerda", value: "left" },
        { label: "Centro", value: "center" },
      ],
    },
  },
  defaultProps: {
    image: "",
    eyebrow: "Lançamento",
    title: "Título do destaque",
    description: "Descreva o empreendimento em uma ou duas frases.",
    buttons: [
      {
        label: "Fale com um especialista",
        href: "/contato",
        variant: "primary",
      },
    ],
    highlights: [],
    badge: "",
    height: "tall",
    align: "left",
  },
  render: ({
    image,
    eyebrow,
    title,
    description,
    buttons,
    highlights,
    badge,
    height,
    align,
  }) => (
    <section className={`g-hero g-hero-${height} g-hero-${align}`}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="g-hero-bg" src={image} alt="" />
      )}
      <div className="g-hero-shade" />
      <div className="g-container g-hero-inner">
        <div className="g-hero-copy">
          {eyebrow && (
            <span className="g-eyebrow g-eyebrow-light">{eyebrow}</span>
          )}
          <h1>{title}</h1>
          {description && <p className="g-hero-lead">{description}</p>}
          <Buttons items={buttons} />
        </div>
        {highlights?.length > 0 && (
          <ul className="g-hero-highlights">
            {highlights.map((h, i) => (
              <li key={i}>
                <Icon name={h.icon} size={20} />
                <span>{h.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {badge && <div className="g-hero-badge">{badge}</div>}
    </section>
  ),
};

/* ------------------------------------------------------------------ */
/* PageHeader – compact banner for internal pages                      */
/* ------------------------------------------------------------------ */

export type PageHeaderProps = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const PageHeader: ComponentConfig<PageHeaderProps> = {
  label: "Cabeçalho de página",
  fields: {
    image: { type: "text", label: "Imagem de fundo (URL)" },
    eyebrow: { type: "text", label: "Chamada" },
    title: { type: "text", label: "Título" },
    description: { type: "textarea", label: "Descrição" },
  },
  defaultProps: {
    image: "",
    eyebrow: "",
    title: "Título da página",
    description: "",
  },
  render: ({ image, eyebrow, title, description }) => (
    <section className="g-pagehead">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="g-hero-bg" src={image} alt="" />
      )}
      <div className="g-hero-shade" />
      <div className="g-container g-pagehead-inner">
        {eyebrow && (
          <span className="g-eyebrow g-eyebrow-light">{eyebrow}</span>
        )}
        <h1>{title}</h1>
        {description && <p className="g-hero-lead">{description}</p>}
      </div>
    </section>
  ),
};
