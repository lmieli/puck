import type { ComponentConfig } from "@puckeditor/core";
import {
  Buttons,
  buttonsField,
  ButtonItem,
  headFields,
  Icon,
  iconField,
  IconName,
  Paragraphs,
  Section,
  SectionHead,
  Tone,
  toneField,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Stats                                                              */
/* ------------------------------------------------------------------ */

export type StatsProps = {
  items: { value: string; label: string }[];
  tone: Tone;
  overlap: boolean;
};

export const Stats: ComponentConfig<StatsProps> = {
  label: "Números",
  fields: {
    items: {
      type: "array",
      label: "Números",
      getItemSummary: (i) => `${i.value} ${i.label}`,
      defaultItemProps: { value: "100+", label: "Descrição" },
      arrayFields: {
        value: { type: "text", label: "Número" },
        label: { type: "text", label: "Legenda" },
      },
    },
    tone: toneField,
    overlap: {
      type: "radio",
      label: "Sobrepor seção anterior",
      options: [
        { label: "Sim", value: true },
        { label: "Não", value: false },
      ],
    },
  },
  defaultProps: {
    items: [
      { value: "1972", label: "Fundação" },
      { value: "435+", label: "Obras realizadas" },
    ],
    tone: "light",
    overlap: false,
  },
  render: ({ items, tone, overlap }) => (
    <div
      className={`g-stats-wrap ${overlap ? "is-overlap" : ""} g-tone-${tone}`}
    >
      <div className="g-container">
        <dl className="g-stats" style={{ ["--cols" as string]: items.length }}>
          {items.map((s, i) => (
            <div key={i}>
              <dt>{s.value}</dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* Features – grid of icon cards                                       */
/* ------------------------------------------------------------------ */

export type FeaturesProps = {
  eyebrow: string;
  title: string;
  intro: string;
  items: { icon: IconName; title: string; text: string }[];
  columns: "2" | "3" | "4";
  tone: Tone;
  align: "left" | "center";
};

export const Features: ComponentConfig<FeaturesProps> = {
  label: "Diferenciais",
  fields: {
    ...headFields,
    items: {
      type: "array",
      label: "Itens",
      getItemSummary: (i) => i.title || "Item",
      defaultItemProps: { icon: "check", title: "Diferencial", text: "" },
      arrayFields: {
        icon: iconField,
        title: { type: "text", label: "Título" },
        text: { type: "textarea", label: "Texto" },
      },
    },
    columns: {
      type: "radio",
      label: "Colunas",
      options: [
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
    },
    align: {
      type: "radio",
      label: "Título",
      options: [
        { label: "Esquerda", value: "left" },
        { label: "Centro", value: "center" },
      ],
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Diferenciais",
    title: "Por que escolher",
    intro: "",
    items: [
      { icon: "bed", title: "3 quartos", text: "Espaço para toda a família." },
      { icon: "car", title: "2 vagas", text: "Garagem para dois carros." },
      {
        icon: "elevator",
        title: "2 elevadores",
        text: "Mais agilidade no dia a dia.",
      },
    ],
    columns: "3",
    tone: "light",
    align: "center",
  },
  render: ({ eyebrow, title, intro, items, columns, tone, align }) => (
    <Section tone={tone}>
      <SectionHead
        eyebrow={eyebrow}
        title={title}
        intro={intro}
        align={align}
      />
      <div className={`g-features g-cols-${columns}`}>
        {items.map((f, i) => (
          <article key={i} className="g-feature">
            <span className="g-feature-icon">
              <Icon name={f.icon} size={24} />
            </span>
            <h3>{f.title}</h3>
            {f.text && <p>{f.text}</p>}
          </article>
        ))}
      </div>
    </Section>
  ),
};

/* ------------------------------------------------------------------ */
/* Split – image + text                                                */
/* ------------------------------------------------------------------ */

export type SplitProps = {
  eyebrow: string;
  title: string;
  text: string;
  bullets: { text: string }[];
  buttons: ButtonItem[];
  image: string;
  imageAlt: string;
  secondImage: string;
  caption: string;
  reverse: boolean;
  tone: Tone;
};

export const Split: ComponentConfig<SplitProps> = {
  label: "Imagem + texto",
  fields: {
    eyebrow: { type: "text", label: "Chamada" },
    title: { type: "text", label: "Título" },
    text: {
      type: "textarea",
      label: "Texto (deixe uma linha em branco entre parágrafos)",
    },
    bullets: {
      type: "array",
      label: "Lista",
      getItemSummary: (i) => i.text || "Item",
      defaultItemProps: { text: "Novo item" },
      arrayFields: { text: { type: "text", label: "Texto" } },
    },
    buttons: buttonsField,
    image: { type: "text", label: "Imagem (URL)" },
    imageAlt: { type: "text", label: "Descrição da imagem" },
    secondImage: { type: "text", label: "Imagem secundária (opcional)" },
    caption: { type: "text", label: "Legenda sobre a imagem" },
    reverse: {
      type: "radio",
      label: "Imagem à",
      options: [
        { label: "Direita", value: false },
        { label: "Esquerda", value: true },
      ],
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "",
    title: "Título da seção",
    text: "Escreva aqui o texto da seção.",
    bullets: [],
    buttons: [],
    image: "",
    imageAlt: "",
    secondImage: "",
    caption: "",
    reverse: false,
    tone: "light",
  },
  render: ({
    eyebrow,
    title,
    text,
    bullets,
    buttons,
    image,
    imageAlt,
    secondImage,
    caption,
    reverse,
    tone,
  }) => (
    <Section tone={tone}>
      <div className={`g-split ${reverse ? "is-reverse" : ""}`}>
        <div className="g-split-copy">
          <SectionHead eyebrow={eyebrow} title={title} />
          <div className="g-prose">
            <Paragraphs text={text} />
          </div>
          {bullets?.length > 0 && (
            <ul className="g-checklist">
              {bullets.map((b, i) => (
                <li key={i}>
                  <Icon name="check" size={20} />
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          )}
          <Buttons items={buttons} />
        </div>
        <div className={`g-split-media ${secondImage ? "has-second" : ""}`}>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={imageAlt}
              loading="lazy"
              className="g-split-main"
            />
          )}
          {secondImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={secondImage}
              alt=""
              loading="lazy"
              className="g-split-second"
            />
          )}
          {caption && <span className="g-split-caption">{caption}</span>}
        </div>
      </div>
    </Section>
  ),
};

/* ------------------------------------------------------------------ */
/* Nearby – location with points of interest                           */
/* ------------------------------------------------------------------ */

export type NearbyProps = {
  eyebrow: string;
  title: string;
  text: string;
  address: string;
  places: { name: string }[];
  image: string;
  mapQuery: string;
  tone: Tone;
};

export const Nearby: ComponentConfig<NearbyProps> = {
  label: "Localização",
  fields: {
    eyebrow: { type: "text", label: "Chamada" },
    title: { type: "text", label: "Título" },
    text: { type: "textarea", label: "Texto" },
    address: { type: "textarea", label: "Endereço" },
    places: {
      type: "array",
      label: "O que tem por perto",
      getItemSummary: (i) => i.name || "Local",
      defaultItemProps: { name: "Novo local" },
      arrayFields: { name: { type: "text", label: "Local" } },
    },
    image: { type: "text", label: "Imagem / mapa ilustrado (URL)" },
    mapQuery: {
      type: "text",
      label: "Busca no Google Maps (deixe vazio para usar a imagem)",
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Localização",
    title: "Tudo pertinho de você",
    text: "",
    address: "",
    places: [{ name: "Supermercado" }, { name: "Bancos" }],
    image: "",
    mapQuery: "",
    tone: "sand",
  },
  render: ({
    eyebrow,
    title,
    text,
    address,
    places,
    image,
    mapQuery,
    tone,
  }) => (
    <Section tone={tone}>
      <div className="g-nearby">
        <div>
          <SectionHead eyebrow={eyebrow} title={title} />
          <div className="g-prose">
            <Paragraphs text={text} />
          </div>
          {address && (
            <p className="g-address">
              <Icon name="pin" size={20} />
              <span>{address}</span>
            </p>
          )}
          <ul className="g-chips">
            {places.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>
        </div>
        <div className="g-nearby-media">
          {mapQuery ? (
            <iframe
              title={`Mapa: ${mapQuery}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                mapQuery
              )}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Mapa da região" loading="lazy" />
            )
          )}
        </div>
      </div>
    </Section>
  ),
};

/* ------------------------------------------------------------------ */
/* CTA band                                                           */
/* ------------------------------------------------------------------ */

export type CtaProps = {
  eyebrow: string;
  title: string;
  text: string;
  buttons: ButtonItem[];
  image: string;
};

export const Cta: ComponentConfig<CtaProps> = {
  label: "Chamada para ação",
  fields: {
    eyebrow: { type: "text", label: "Chamada" },
    title: { type: "text", label: "Título" },
    text: { type: "textarea", label: "Texto" },
    buttons: buttonsField,
    image: { type: "text", label: "Imagem de fundo (URL)" },
  },
  defaultProps: {
    eyebrow: "",
    title: "Agende uma visita",
    text: "Nossa equipe mostra cada detalhe pessoalmente.",
    buttons: [{ label: "Fale conosco", href: "/contato", variant: "primary" }],
    image: "",
  },
  render: ({ eyebrow, title, text, buttons, image }) => (
    <section className="g-cta">
      <div className="g-container">
        <div className="g-cta-card">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="g-hero-bg" src={image} alt="" loading="lazy" />
          )}
          <div className="g-cta-shade" />
          <div className="g-cta-copy">
            {eyebrow && (
              <span className="g-eyebrow g-eyebrow-light">{eyebrow}</span>
            )}
            <h2>{title}</h2>
            {text && <p>{text}</p>}
          </div>
          <Buttons items={buttons} />
        </div>
      </div>
    </section>
  ),
};

/* ------------------------------------------------------------------ */
/* Quote / mission statement                                           */
/* ------------------------------------------------------------------ */

export type StatementProps = {
  eyebrow: string;
  text: string;
  author: string;
  tone: Tone;
};

export const Statement: ComponentConfig<StatementProps> = {
  label: "Frase de destaque",
  fields: {
    eyebrow: { type: "text", label: "Chamada" },
    text: { type: "textarea", label: "Frase" },
    author: { type: "text", label: "Assinatura" },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "",
    text: "Uma frase que resume a empresa.",
    author: "",
    tone: "dark",
  },
  render: ({ eyebrow, text, author, tone }) => (
    <Section tone={tone} className="g-statement">
      {eyebrow && <span className="g-eyebrow">{eyebrow}</span>}
      <blockquote>{text}</blockquote>
      {author && <cite>{author}</cite>}
    </Section>
  ),
};
