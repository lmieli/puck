import type { Config } from "@puckeditor/core";
import {
  Header,
  HeaderProps,
  Footer,
  FooterProps,
  WhatsAppFloat,
} from "./components/site-chrome";
import {
  Hero,
  HeroProps,
  PageHeader,
  PageHeaderProps,
} from "./components/heroes";
import {
  Cta,
  CtaProps,
  Features,
  FeaturesProps,
  Nearby,
  NearbyProps,
  Split,
  SplitProps,
  Statement,
  StatementProps,
  Stats,
  StatsProps,
} from "./components/sections";
import {
  Gallery,
  GalleryProps,
  Portfolio,
  PortfolioProps,
  Progress,
  ProgressProps,
  Properties,
  PropertiesProps,
  Specs,
  SpecsProps,
} from "./components/listings";
import { Contact, ContactProps } from "./components/contact";

export type Components = {
  Header: HeaderProps;
  Hero: HeroProps;
  PageHeader: PageHeaderProps;
  Stats: StatsProps;
  Features: FeaturesProps;
  Split: SplitProps;
  Statement: StatementProps;
  Properties: PropertiesProps;
  Gallery: GalleryProps;
  Specs: SpecsProps;
  Nearby: NearbyProps;
  Progress: ProgressProps;
  Portfolio: PortfolioProps;
  Cta: CtaProps;
  Contact: ContactProps;
  Footer: FooterProps;
};

export type RootProps = {
  title: string;
  description: string;
  whatsapp: boolean;
};

export const config: Config<Components, RootProps> = {
  categories: {
    estrutura: {
      title: "Estrutura do site",
      components: ["Header", "Footer"],
    },
    topo: {
      title: "Topo de página",
      components: ["Hero", "PageHeader"],
    },
    conteudo: {
      title: "Conteúdo",
      components: ["Split", "Features", "Stats", "Statement", "Cta"],
    },
    imoveis: {
      title: "Imóveis e obras",
      components: [
        "Properties",
        "Gallery",
        "Specs",
        "Nearby",
        "Progress",
        "Portfolio",
      ],
    },
    contato: {
      title: "Contato",
      components: ["Contact"],
    },
  },
  root: {
    fields: {
      title: {
        type: "text",
        label: "Título da página (aba do navegador / Google)",
      },
      description: { type: "textarea", label: "Descrição para o Google" },
      whatsapp: {
        type: "radio",
        label: "Botão flutuante do WhatsApp",
        options: [
          { label: "Mostrar", value: true },
          { label: "Esconder", value: false },
        ],
      },
    },
    defaultProps: {
      title: "Gemini Engenharia",
      description: "",
      whatsapp: true,
    },
    render: ({ children, whatsapp }) => (
      <div className="g-site">
        {children}
        {whatsapp !== false && <WhatsAppFloat />}
      </div>
    ),
  },
  components: {
    Header,
    Hero,
    PageHeader,
    Stats,
    Features,
    Split,
    Statement,
    Properties,
    Gallery,
    Specs,
    Nearby,
    Progress,
    Portfolio,
    Cta,
    Contact,
    Footer,
  },
};

export default config;
