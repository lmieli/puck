import { fontOptions } from "./design.ts";

// Single source of truth for every block: the Puck editor fields, the
// validation used when the AI edits a page, and the catalog the AI reads are
// all generated from these definitions. This file is pure data (no React) so
// it can be imported by the server, the editor and the tests.

export type FieldDef =
  | { type: "text"; label: string; help?: string }
  | { type: "textarea"; label: string; help?: string }
  | { type: "number"; label: string; help?: string; min?: number; max?: number }
  | {
      type: "select";
      label: string;
      help?: string;
      options: { value: string; label: string }[];
    }
  | { type: "boolean"; label: string; help?: string }
  | { type: "color"; label: string; help?: string; optional?: boolean }
  | {
      type: "size";
      label: string;
      help?: string;
      min: number;
      max: number;
      step?: number;
      unit: "px" | "%";
      /** Value shown/used when the field is left empty ("auto"). */
      auto?: string;
    }
  | { type: "image"; label: string; help?: string }
  | {
      type: "list";
      label: string;
      help?: string;
      item: Record<string, FieldDef>;
      summary: string;
      max?: number;
    };

export type BlockDef = {
  label: string;
  category: Category;
  /** What the block is for — shown to the AI and used as the editor hint. */
  description: string;
  fields: Record<string, FieldDef>;
  defaults: Record<string, unknown>;
};

export type Category = "estrutura" | "cinema" | "conteudo" | "conversao";

export const categories: Record<Category, string> = {
  estrutura: "Estrutura",
  cinema: "Cinematográfico",
  conteudo: "Conteúdo",
  conversao: "Conversão",
};

/* ------------------------------------------------------------------ */
/* Shared field shapes                                                  */
/* ------------------------------------------------------------------ */

const opt = (...pairs: [string, string][]) =>
  pairs.map(([value, label]) => ({ value, label }));

const buttons: FieldDef = {
  type: "list",
  label: "Botões",
  summary: "label",
  max: 3,
  item: {
    label: { type: "text", label: "Texto" },
    href: { type: "text", label: "Link" },
    style: {
      type: "select",
      label: "Estilo",
      options: opt(
        ["primary", "Principal"],
        ["secondary", "Secundário"],
        ["link", "Link com seta"]
      ),
    },
  },
};

const tone: FieldDef = {
  type: "select",
  label: "Fundo",
  help: "auto segue o tema da página; inverse usa o tema oposto para criar contraste",
  options: opt(
    ["auto", "Tema da página"],
    ["inverse", "Invertido"],
    ["subtle", "Suave"],
    ["accent", "Cor de destaque"]
  ),
};

const align: FieldDef = {
  type: "select",
  label: "Alinhamento",
  options: opt(["center", "Centro"], ["left", "Esquerda"]),
};

/* ------------------------------------------------------------------ */
/* Props every block accepts (spacing, background, motion, visibility)   */
/* ------------------------------------------------------------------ */

const spaceOptions = opt(
  ["auto", "Padrão"],
  ["none", "Nenhum"],
  ["sm", "Pequeno"],
  ["lg", "Grande"],
  ["xl", "Enorme"]
);

export const commonFields = {
  spaceTop: { type: "select", label: "Espaço acima", options: spaceOptions },
  spaceBottom: {
    type: "select",
    label: "Espaço abaixo",
    options: spaceOptions,
  },
  width: {
    type: "select",
    label: "Largura do conteúdo",
    help: "auto segue a configuração da página",
    options: opt(
      ["auto", "Padrão da página"],
      ["narrow", "Estreita"],
      ["normal", "Normal"],
      ["wide", "Larga"],
      ["full", "Tela toda"]
    ),
  },
  widthPx: {
    type: "size",
    label: "Largura máxima do conteúdo",
    help: "em pixels; vazio segue a opção acima. Dá para arrastar as alças laterais do bloco",
    min: 320,
    max: 2000,
    step: 10,
    unit: "px",
    auto: "automática",
  },
  spaceTopPx: {
    type: "size",
    label: "Espaço acima (px)",
    help: "valor exato; vazio segue a opção Espaço acima. Dá para arrastar a alça do topo do bloco",
    min: 0,
    max: 640,
    step: 4,
    unit: "px",
    auto: "padrão",
  },
  spaceBottomPx: {
    type: "size",
    label: "Espaço abaixo (px)",
    help: "valor exato; vazio segue a opção Espaço abaixo. Dá para arrastar a alça da base do bloco",
    min: 0,
    max: 640,
    step: 4,
    unit: "px",
    auto: "padrão",
  },
  textAlign: {
    type: "select",
    label: "Alinhamento do texto",
    options: opt(
      ["auto", "Padrão do bloco"],
      ["left", "Esquerda"],
      ["center", "Centro"],
      ["right", "Direita"]
    ),
  },
  bgColor: {
    type: "color",
    label: "Cor de fundo",
    optional: true,
    help: "vazio = padrão do tema",
  },
  textColor: {
    type: "color",
    label: "Cor do texto",
    optional: true,
    help: "vazio = padrão do tema",
  },
  bgImage: {
    type: "image",
    label: "Imagem de fundo",
    help: "funciona em seções comuns (Imagem + texto, Texto, Cartões, Números, Chamada final…), não na Abertura cinematográfica, no Produto em 3D nem na Galeria horizontal",
  },
  bgOverlay: {
    type: "select",
    label: "Escurecer a imagem de fundo",
    help: "com imagem de fundo e escurecimento, o texto vira claro automaticamente",
    options: opt(["none", "Não"], ["soft", "Leve"], ["strong", "Forte"]),
  },
  animation: {
    type: "select",
    label: "Animação de entrada",
    options: opt(
      ["auto", "Padrão"],
      ["none", "Nenhuma"],
      ["fade", "Aparecer"],
      ["rise", "Subir"],
      ["zoom", "Zoom"],
      ["slide", "Deslizar"]
    ),
  },
  hideOn: {
    type: "select",
    label: "Esconder em",
    options: opt(
      ["never", "Nunca"],
      ["mobile", "Celular"],
      ["desktop", "Computador"]
    ),
  },
  anchor: { type: "text", label: "Âncora (para links como #contato)" },
} satisfies Record<string, FieldDef>;

export const commonDefaults = {
  spaceTop: "auto",
  spaceBottom: "auto",
  width: "auto",
  widthPx: "",
  spaceTopPx: "",
  spaceBottomPx: "",
  textAlign: "auto",
  bgColor: "",
  textColor: "",
  bgImage: "",
  bgOverlay: "soft",
  animation: "auto",
  hideOn: "never",
  anchor: "",
};

export const commonKeys = Object.keys(commonFields);

/* ------------------------------------------------------------------ */
/* Blocks                                                               */
/* ------------------------------------------------------------------ */

export const blocks = {
  Nav: {
    label: "Menu",
    category: "estrutura",
    description:
      "Barra de navegação fixa e translúcida no topo. Use uma vez, como primeiro bloco.",
    fields: {
      brand: { type: "text", label: "Marca (texto)" },
      logo: { type: "image", label: "Logo (opcional, substitui o texto)" },
      links: {
        type: "list",
        label: "Links",
        summary: "label",
        max: 7,
        item: {
          label: { type: "text", label: "Texto" },
          href: { type: "text", label: "Link" },
        },
      },
      ctaLabel: { type: "text", label: "Botão" },
      ctaHref: { type: "text", label: "Link do botão" },
      navStyle: {
        type: "select",
        label: "Aparência do menu",
        options: opt(
          ["blur", "Vidro fosco"],
          ["solid", "Cor sólida"],
          ["transparent", "Transparente"]
        ),
      },
      navAlign: {
        type: "select",
        label: "Posição dos links",
        options: opt(["right", "Direita"], ["center", "Centro"]),
      },
      sticky: { type: "boolean", label: "Fixo no topo ao rolar" },
    },
    defaults: {
      navStyle: "blur",
      navAlign: "right",
      sticky: true,
      brand: "Marca",
      logo: "",
      links: [
        { label: "Visão geral", href: "#" },
        { label: "Recursos", href: "#recursos" },
        { label: "Especificações", href: "#specs" },
      ],
      ctaLabel: "Comprar",
      ctaHref: "#comprar",
    },
  },

  Hero: {
    label: "Abertura",
    category: "cinema",
    description:
      "Primeira dobra da página. variant=cinematic prende a seção e, ao rolar, a imagem cresce até ocupar a tela enquanto o título se dissolve (efeito de lançamento de produto). variant=split coloca texto e imagem lado a lado. variant=minimal é só tipografia grande.",
    fields: {
      variant: {
        type: "select",
        label: "Estilo",
        options: opt(
          ["cinematic", "Cinematográfico (rolagem)"],
          ["split", "Texto + imagem"],
          ["minimal", "Só tipografia"]
        ),
      },
      eyebrow: { type: "text", label: "Chamada" },
      title: {
        type: "textarea",
        label: "Título",
        help: "Curto e forte: 2 a 6 palavras.",
      },
      subtitle: { type: "textarea", label: "Subtítulo" },
      image: { type: "image", label: "Imagem" },
      video: { type: "text", label: "Vídeo (URL .mp4, opcional)" },
      mediaSize: {
        type: "select",
        label: "Tamanho da foto ao abrir",
        help: "só no estilo cinematográfico: a foto começa como um cartão e cresce com a rolagem",
        options: opt(
          ["small", "Pequena"],
          ["medium", "Média"],
          ["large", "Grande"],
          ["full", "Tela toda"]
        ),
      },
      mediaInset: {
        type: "size",
        label: "Margem lateral da foto (%)",
        help: "valor exato da margem de cada lado quando a foto abre como cartão; 0 encosta nas bordas. Vazio segue o tamanho acima. Dá para arrastar as laterais da foto",
        min: 0,
        max: 30,
        step: 0.5,
        unit: "%",
        auto: "do tamanho",
      },
      mediaInsetBottom: {
        type: "size",
        label: "Margem inferior da foto (%)",
        help: "distância da foto até a base da tela quando abre como cartão. Dá para arrastar a base da foto",
        min: 0,
        max: 25,
        step: 0.5,
        unit: "%",
        auto: "do tamanho",
      },
      titleSize: {
        type: "select",
        label: "Tamanho do título",
        options: opt(
          ["sm", "Pequeno"],
          ["md", "Médio"],
          ["lg", "Grande"],
          ["xl", "Enorme"]
        ),
      },
      imagePosition: {
        type: "select",
        label: "Enquadramento da foto",
        options: opt(
          ["center", "Centro"],
          ["top", "Topo"],
          ["bottom", "Base"],
          ["left", "Esquerda"],
          ["right", "Direita"]
        ),
      },
      buttons,
      tone,
    },
    defaults: {
      variant: "cinematic",
      mediaSize: "large",
      mediaInset: "",
      mediaInsetBottom: "",
      titleSize: "md",
      imagePosition: "center",
      eyebrow: "Novo",
      title: "Simplesmente extraordinário.",
      subtitle: "Uma frase que explica por que isto importa.",
      image: "",
      video: "",
      buttons: [
        { label: "Saiba mais", href: "#recursos", style: "primary" },
        { label: "Comprar", href: "#comprar", style: "link" },
      ],
      tone: "auto",
    },
  },

  Product3D: {
    label: "Produto em 3D",
    category: "cinema",
    description:
      "Renderização 3D em tempo real que gira e se aproxima conforme a pessoa rola, enquanto legendas contam a história do produto passo a passo. Aceita um modelo .glb/.gltf ou usa um objeto 3D gerado (smartphone, relógio, alto-falante, fone).",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      shape: {
        type: "select",
        label: "Objeto",
        options: opt(
          ["phone", "Smartphone"],
          ["watch", "Relógio"],
          ["speaker", "Alto-falante"],
          ["headphones", "Fone de ouvido"]
        ),
      },
      model: { type: "text", label: "Modelo 3D próprio (URL .glb, opcional)" },
      color: { type: "color", label: "Cor do produto" },
      finish: {
        type: "select",
        label: "Acabamento",
        options: opt(
          ["metal", "Metal escovado"],
          ["gloss", "Brilhante"],
          ["matte", "Fosco"]
        ),
      },
      steps: {
        type: "list",
        label: "Legendas (uma por etapa da rolagem)",
        summary: "title",
        max: 6,
        item: {
          title: { type: "text", label: "Título" },
          text: { type: "textarea", label: "Texto" },
        },
      },
      tone,
    },
    defaults: {
      eyebrow: "Design",
      title: "Feito para ser visto de todos os ângulos.",
      shape: "phone",
      model: "",
      color: "#c9ccd1",
      finish: "metal",
      steps: [
        {
          title: "Titânio aeroespacial",
          text: "Leve, resistente e frio ao toque.",
        },
        {
          title: "Tela de ponta a ponta",
          text: "Bordas mais finas, imagem maior.",
        },
        {
          title: "Câmera reinventada",
          text: "Três lentes. Uma só experiência.",
        },
      ],
      tone: "inverse",
    },
  },

  StickyStory: {
    label: "História com rolagem",
    category: "cinema",
    description:
      "Storytelling visual: a imagem fica presa de um lado e troca suavemente a cada capítulo de texto que passa do outro lado. Ideal para explicar 3 a 5 benefícios em sequência.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título da seção" },
      chapters: {
        type: "list",
        label: "Capítulos",
        summary: "title",
        max: 6,
        item: {
          eyebrow: { type: "text", label: "Chamada" },
          title: { type: "text", label: "Título" },
          text: { type: "textarea", label: "Texto" },
          image: { type: "image", label: "Imagem" },
        },
      },
      mediaSide: {
        type: "select",
        label: "Imagem à",
        options: opt(["left", "Esquerda"], ["right", "Direita"]),
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "",
      chapters: [
        {
          eyebrow: "01",
          title: "Primeiro capítulo",
          text: "Conte uma parte da história.",
          image: "",
        },
        {
          eyebrow: "02",
          title: "Segundo capítulo",
          text: "Avance a narrativa.",
          image: "",
        },
        {
          eyebrow: "03",
          title: "Terceiro capítulo",
          text: "Feche com impacto.",
          image: "",
        },
      ],
      mediaSide: "left",
      tone: "auto",
    },
  },

  Parallax: {
    label: "Parallax",
    category: "cinema",
    description:
      "Imagem de tela cheia que se move mais devagar que a página (profundidade), com uma frase sobreposta que surge ao rolar. Bom para respiros visuais entre seções.",
    fields: {
      image: { type: "image", label: "Imagem" },
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "textarea", label: "Frase" },
      text: { type: "textarea", label: "Texto" },
      imagePosition: {
        type: "select",
        label: "Enquadramento da foto",
        options: opt(["center", "Centro"], ["top", "Topo"], ["bottom", "Base"]),
      },
      intensity: {
        type: "select",
        label: "Profundidade",
        options: opt(
          ["soft", "Suave"],
          ["medium", "Média"],
          ["strong", "Forte"]
        ),
      },
      height: {
        type: "select",
        label: "Altura",
        options: opt(
          ["screen", "Tela cheia"],
          ["tall", "Alta"],
          ["medium", "Média"]
        ),
      },
    },
    defaults: {
      imagePosition: "center",
      image: "",
      eyebrow: "",
      title: "Uma frase que respira.",
      text: "",
      intensity: "medium",
      height: "screen",
    },
  },

  Reveal: {
    label: "Frase que se revela",
    category: "cinema",
    description:
      "Um parágrafo grande em que as palavras acendem uma a uma conforme a pessoa rola. Use para a declaração principal da marca (1 a 3 frases).",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      text: { type: "textarea", label: "Texto" },
      highlight: {
        type: "text",
        label: "Palavras em destaque (separe por vírgula)",
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      text: "Cada detalhe foi repensado para desaparecer, até sobrar só o que importa.",
      highlight: "só o que importa",
      tone: "auto",
    },
  },

  HorizontalScroll: {
    label: "Galeria horizontal",
    category: "cinema",
    description:
      "Seção presa em que a rolagem vertical move uma fileira de cartões na horizontal. Ótima para coleções, cores, ambientes ou etapas.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      items: {
        type: "list",
        label: "Cartões",
        summary: "title",
        max: 10,
        item: {
          image: { type: "image", label: "Imagem" },
          title: { type: "text", label: "Título" },
          text: { type: "text", label: "Texto" },
        },
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "Escolha o seu.",
      items: [
        { image: "", title: "Primeiro", text: "Descrição curta" },
        { image: "", title: "Segundo", text: "Descrição curta" },
        { image: "", title: "Terceiro", text: "Descrição curta" },
        { image: "", title: "Quarto", text: "Descrição curta" },
      ],
      tone: "auto",
    },
  },

  Bento: {
    label: "Grade de recursos",
    category: "conteudo",
    description:
      "Grade em mosaico (estilo bento) com cartões de tamanhos diferentes: números grandes, imagens e frases curtas. Cada cartão aparece com animação ao entrar na tela.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      intro: { type: "textarea", label: "Introdução" },
      tiles: {
        type: "list",
        label: "Cartões",
        summary: "title",
        max: 9,
        item: {
          size: {
            type: "select",
            label: "Tamanho",
            options: opt(
              ["sm", "Pequeno"],
              ["md", "Médio"],
              ["lg", "Grande"],
              ["wide", "Largo"],
              ["tall", "Alto"]
            ),
          },
          style: {
            type: "select",
            label: "Estilo",
            options: opt(
              ["plain", "Neutro"],
              ["dark", "Escuro"],
              ["accent", "Destaque"],
              ["image", "Imagem de fundo"]
            ),
          },
          stat: { type: "text", label: "Número grande (opcional)" },
          title: { type: "text", label: "Título" },
          text: { type: "textarea", label: "Texto" },
          image: { type: "image", label: "Imagem" },
        },
      },
      tone,
    },
    defaults: {
      eyebrow: "Recursos",
      title: "Tudo o que você precisa.",
      intro: "",
      tiles: [
        {
          size: "lg",
          style: "image",
          stat: "",
          title: "Destaque principal",
          text: "",
          image: "",
        },
        {
          size: "sm",
          style: "plain",
          stat: "24h",
          title: "de bateria",
          text: "",
          image: "",
        },
        {
          size: "sm",
          style: "accent",
          stat: "2x",
          title: "mais rápido",
          text: "",
          image: "",
        },
        {
          size: "wide",
          style: "dark",
          stat: "",
          title: "Uma frase sobre o recurso",
          text: "Detalhe em uma linha.",
          image: "",
        },
      ],
      tone: "subtle",
    },
  },

  Feature: {
    label: "Imagem + texto",
    category: "conteudo",
    description:
      "Um recurso explicado com imagem grande e texto ao lado, com lista opcional e botões.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      text: {
        type: "textarea",
        label: "Texto (linha em branco separa parágrafos)",
      },
      bullets: {
        type: "list",
        label: "Lista",
        summary: "text",
        max: 6,
        item: { text: { type: "text", label: "Item" } },
      },
      image: { type: "image", label: "Imagem" },
      reverse: { type: "boolean", label: "Imagem à esquerda" },
      buttons,
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "Um recurso, bem explicado.",
      text: "Descreva o benefício em duas ou três frases.",
      bullets: [],
      image: "",
      reverse: false,
      buttons: [],
      tone: "auto",
    },
  },

  Stats: {
    label: "Números",
    category: "conteudo",
    description:
      "Números grandes que contam do zero ao entrar na tela, com legendas curtas.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      items: {
        type: "list",
        label: "Números",
        summary: "value",
        max: 4,
        item: {
          value: { type: "text", label: "Número (ex.: 40h, 2x, 1972)" },
          label: { type: "text", label: "Legenda" },
        },
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "",
      items: [
        { value: "40h", label: "de bateria" },
        { value: "2x", label: "mais leve" },
        { value: "99%", label: "de satisfação" },
      ],
      tone: "auto",
    },
  },

  Specs: {
    label: "Especificações",
    category: "conteudo",
    description:
      "Tabela limpa de especificações técnicas, organizada em grupos.",
    fields: {
      title: { type: "text", label: "Título" },
      groups: {
        type: "list",
        label: "Grupos",
        summary: "name",
        max: 8,
        item: {
          name: { type: "text", label: "Grupo" },
          rows: {
            type: "textarea",
            label: "Linhas (uma por linha, formato Rótulo: valor)",
          },
        },
      },
      tone,
    },
    defaults: {
      title: "Especificações técnicas",
      groups: [
        {
          name: "Dimensões",
          rows: "Altura: 14,7 cm\nLargura: 7,1 cm\nPeso: 187 g",
        },
        {
          name: "Bateria",
          rows: "Duração: até 40 horas\nRecarga: 10 min = 5 h",
        },
      ],
      tone: "auto",
    },
  },

  Gallery: {
    label: "Galeria",
    category: "conteudo",
    description: "Grade de fotos com legendas que ampliam ao clicar.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      images: {
        type: "list",
        label: "Fotos",
        summary: "caption",
        max: 16,
        item: {
          src: { type: "image", label: "Imagem" },
          caption: { type: "text", label: "Legenda" },
        },
      },
      columns: {
        type: "select",
        label: "Colunas",
        options: opt(["2", "2"], ["3", "3"], ["4", "4"]),
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "Galeria",
      images: [
        { src: "", caption: "" },
        { src: "", caption: "" },
        { src: "", caption: "" },
      ],
      columns: "3",
      tone: "auto",
    },
  },

  Quotes: {
    label: "Depoimentos",
    category: "conteudo",
    description: "Depoimentos de clientes ou da imprensa em cartões.",
    fields: {
      title: { type: "text", label: "Título" },
      items: {
        type: "list",
        label: "Depoimentos",
        summary: "author",
        max: 6,
        item: {
          quote: { type: "textarea", label: "Depoimento" },
          author: { type: "text", label: "Autor" },
          role: { type: "text", label: "Cargo / veículo" },
        },
      },
      tone,
    },
    defaults: {
      title: "O que estão dizendo",
      items: [
        {
          quote: "Um depoimento curto e específico.",
          author: "Nome",
          role: "Cliente",
        },
        { quote: "Outro depoimento curto.", author: "Nome", role: "Cliente" },
      ],
      tone: "subtle",
    },
  },

  Faq: {
    label: "Perguntas frequentes",
    category: "conteudo",
    description: "Perguntas e respostas em sanfona.",
    fields: {
      title: { type: "text", label: "Título" },
      items: {
        type: "list",
        label: "Perguntas",
        summary: "question",
        max: 12,
        item: {
          question: { type: "text", label: "Pergunta" },
          answer: { type: "textarea", label: "Resposta" },
        },
      },
      tone,
    },
    defaults: {
      title: "Perguntas frequentes",
      items: [
        {
          question: "Qual é o prazo de entrega?",
          answer: "Responda de forma direta.",
        },
        { question: "Tem garantia?", answer: "Responda de forma direta." },
      ],
      tone: "auto",
    },
  },

  Cta: {
    label: "Compra / chamada final",
    category: "conversao",
    description:
      "Fechamento da página: título, preço opcional, amostras de cor e botões. Use para levar à compra ou ao contato.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      text: { type: "textarea", label: "Texto" },
      price: { type: "text", label: "Preço (opcional)" },
      priceNote: { type: "text", label: "Observação do preço" },
      swatches: {
        type: "list",
        label: "Cores disponíveis",
        summary: "name",
        max: 6,
        item: {
          name: { type: "text", label: "Nome" },
          color: { type: "color", label: "Cor" },
        },
      },
      image: { type: "image", label: "Imagem" },
      buttons,
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "Pronto para o próximo nível?",
      text: "",
      price: "",
      priceNote: "",
      swatches: [],
      image: "",
      buttons: [{ label: "Comprar agora", href: "#", style: "primary" }],
      tone: "subtle",
    },
  },

  Contact: {
    label: "Formulário de contato",
    category: "conversao",
    description:
      "Formulário que salva os contatos no painel do cliente (aba Contatos). Use em sites de serviço, imobiliárias, clínicas etc.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      text: { type: "textarea", label: "Texto" },
      email: { type: "text", label: "E-mail exibido" },
      phone: { type: "text", label: "Telefone exibido" },
      address: { type: "textarea", label: "Endereço exibido" },
      button: { type: "text", label: "Texto do botão" },
      success: { type: "text", label: "Mensagem de sucesso" },
      tone,
    },
    defaults: {
      eyebrow: "Contato",
      title: "Vamos conversar.",
      text: "Deixe seus dados e respondemos em até um dia útil.",
      email: "",
      phone: "",
      address: "",
      button: "Enviar",
      success: "Recebemos sua mensagem. Obrigado!",
      tone: "subtle",
    },
  },

  Text: {
    label: "Texto",
    category: "conteudo",
    description:
      "Bloco de texto livre: chamada, título, parágrafos e botões. Serve para manifestos, introduções, avisos e páginas institucionais.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "textarea", label: "Título" },
      body: {
        type: "textarea",
        label: "Texto (linha em branco separa parágrafos)",
      },
      size: {
        type: "select",
        label: "Tamanho do título",
        options: opt(
          ["sm", "Pequeno"],
          ["md", "Médio"],
          ["lg", "Grande"],
          ["xl", "Enorme"]
        ),
      },
      align,
      buttons,
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "Um título claro.",
      body: "Escreva aqui o texto. Separe os parágrafos com uma linha em branco.",
      size: "md",
      align: "center",
      buttons: [],
      tone: "auto",
    },
  },

  Image: {
    label: "Imagem",
    category: "conteudo",
    description:
      "Uma imagem grande com legenda opcional, em largura contida ou tela cheia. Pode virar link.",
    fields: {
      image: { type: "image", label: "Imagem" },
      alt: { type: "text", label: "Descrição da imagem (acessibilidade)" },
      caption: { type: "text", label: "Legenda" },
      ratio: {
        type: "select",
        label: "Proporção",
        options: opt(
          ["auto", "Original"],
          ["16/9", "16:9"],
          ["21/9", "Panorâmica 21:9"],
          ["4/3", "4:3"],
          ["1/1", "Quadrada"]
        ),
      },
      fit: {
        type: "select",
        label: "Ajuste",
        options: opt(["cover", "Preencher"], ["contain", "Mostrar inteira"]),
      },
      position: {
        type: "select",
        label: "Enquadramento",
        options: opt(
          ["center", "Centro"],
          ["top", "Topo"],
          ["bottom", "Base"],
          ["left", "Esquerda"],
          ["right", "Direita"]
        ),
      },
      widthPct: {
        type: "size",
        label: "Largura da imagem (%)",
        help: "em relação à largura do conteúdo. Dá para arrastar as laterais da imagem",
        min: 10,
        max: 100,
        step: 1,
        unit: "%",
      },
      heightPx: {
        type: "size",
        label: "Altura da imagem (px)",
        help: "vazio usa a proporção escolhida. Dá para arrastar a base da imagem",
        min: 120,
        max: 1600,
        step: 10,
        unit: "px",
        auto: "pela proporção",
      },
      rounded: { type: "boolean", label: "Cantos arredondados" },
      href: { type: "text", label: "Link ao clicar (opcional)" },
      tone,
    },
    defaults: {
      image: "",
      alt: "",
      caption: "",
      ratio: "16/9",
      fit: "cover",
      position: "center",
      widthPct: 100,
      heightPx: "",
      rounded: true,
      href: "",
      tone: "auto",
    },
  },

  Cards: {
    label: "Cartões",
    category: "conteudo",
    description:
      "Grade de cartões com imagem, título, texto e link. Use para serviços, produtos, equipe, projetos ou notícias.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      intro: { type: "textarea", label: "Introdução" },
      items: {
        type: "list",
        label: "Cartões",
        summary: "title",
        max: 12,
        item: {
          image: { type: "image", label: "Imagem" },
          title: { type: "text", label: "Título" },
          text: { type: "textarea", label: "Texto" },
          linkLabel: { type: "text", label: "Texto do link" },
          href: { type: "text", label: "Link" },
        },
      },
      columns: {
        type: "select",
        label: "Colunas",
        options: opt(["2", "2"], ["3", "3"], ["4", "4"]),
      },
      cardStyle: {
        type: "select",
        label: "Estilo do cartão",
        options: opt(
          ["filled", "Preenchido"],
          ["outline", "Contorno"],
          ["flat", "Sem moldura"]
        ),
      },
      ratio: {
        type: "select",
        label: "Proporção da imagem",
        options: opt(
          ["16/10", "16:10"],
          ["4/3", "4:3"],
          ["1/1", "Quadrada"],
          ["3/4", "Retrato"]
        ),
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "O que fazemos",
      intro: "",
      items: [
        {
          image: "",
          title: "Primeiro",
          text: "Descrição curta do primeiro item.",
          linkLabel: "Saiba mais",
          href: "#",
        },
        {
          image: "",
          title: "Segundo",
          text: "Descrição curta do segundo item.",
          linkLabel: "Saiba mais",
          href: "#",
        },
        {
          image: "",
          title: "Terceiro",
          text: "Descrição curta do terceiro item.",
          linkLabel: "Saiba mais",
          href: "#",
        },
      ],
      columns: "3",
      cardStyle: "filled",
      ratio: "16/10",
      tone: "auto",
    },
  },

  Pricing: {
    label: "Planos e preços",
    category: "conversao",
    description:
      "Tabela de planos lado a lado, com preço, lista de itens, botão e um plano em destaque.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      intro: { type: "textarea", label: "Introdução" },
      plans: {
        type: "list",
        label: "Planos",
        summary: "name",
        max: 4,
        item: {
          name: { type: "text", label: "Nome" },
          badge: { type: "text", label: "Etiqueta (ex.: Mais popular)" },
          price: { type: "text", label: "Preço" },
          period: { type: "text", label: "Período (ex.: /mês)" },
          description: { type: "text", label: "Descrição curta" },
          features: { type: "textarea", label: "Itens (um por linha)" },
          buttonLabel: { type: "text", label: "Texto do botão" },
          href: { type: "text", label: "Link do botão" },
          highlight: { type: "boolean", label: "Destacar este plano" },
        },
      },
      tone,
    },
    defaults: {
      eyebrow: "Planos",
      title: "Escolha o seu plano.",
      intro: "",
      plans: [
        {
          name: "Essencial",
          badge: "",
          price: "R$ 0",
          period: "/mês",
          description: "Para começar.",
          features: "Item um\nItem dois",
          buttonLabel: "Começar",
          href: "#",
          highlight: false,
        },
        {
          name: "Pro",
          badge: "Mais popular",
          price: "R$ 99",
          period: "/mês",
          description: "Para crescer.",
          features: "Tudo do Essencial\nItem três\nItem quatro",
          buttonLabel: "Assinar",
          href: "#",
          highlight: true,
        },
        {
          name: "Empresas",
          badge: "",
          price: "Sob consulta",
          period: "",
          description: "Para grandes equipes.",
          features: "Tudo do Pro\nSuporte dedicado",
          buttonLabel: "Falar conosco",
          href: "#",
          highlight: false,
        },
      ],
      tone: "auto",
    },
  },

  Logos: {
    label: "Logos de clientes",
    category: "conteudo",
    description:
      "Faixa de logos de clientes, parceiros ou imprensa, em uma linha que quebra no celular.",
    fields: {
      title: { type: "text", label: "Título (opcional)" },
      items: {
        type: "list",
        label: "Logos",
        summary: "name",
        max: 12,
        item: {
          image: { type: "image", label: "Logo" },
          name: { type: "text", label: "Nome" },
          href: { type: "text", label: "Link (opcional)" },
        },
      },
      grayscale: { type: "boolean", label: "Logos em tons de cinza" },
      tone,
    },
    defaults: {
      title: "Quem confia em nós",
      items: [
        { image: "", name: "Cliente 1", href: "" },
        { image: "", name: "Cliente 2", href: "" },
        { image: "", name: "Cliente 3", href: "" },
        { image: "", name: "Cliente 4", href: "" },
      ],
      grayscale: true,
      tone: "auto",
    },
  },

  Embed: {
    label: "Vídeo ou mapa",
    category: "conteudo",
    description:
      "Incorpora um vídeo (YouTube, Vimeo, Loom), um mapa (Google Maps embed, OpenStreetMap) ou uma agenda (Calendly). Aceita só endereços https de provedores conhecidos; não aceita HTML nem scripts.",
    fields: {
      eyebrow: { type: "text", label: "Chamada" },
      title: { type: "text", label: "Título" },
      url: {
        type: "text",
        label:
          "Endereço (cole o link do vídeo ou o link de incorporação do mapa)",
      },
      ratio: {
        type: "select",
        label: "Proporção",
        options: opt(
          ["16/9", "16:9"],
          ["21/9", "21:9"],
          ["4/3", "4:3"],
          ["1/1", "Quadrada"]
        ),
      },
      tone,
    },
    defaults: {
      eyebrow: "",
      title: "",
      url: "",
      ratio: "16/9",
      tone: "auto",
    },
  },

  Divider: {
    label: "Divisor",
    category: "estrutura",
    description: "Linha, pontilhado ou ornamento para separar seções.",
    fields: {
      style: {
        type: "select",
        label: "Estilo",
        options: opt(
          ["line", "Linha"],
          ["dashed", "Tracejado"],
          ["dots", "Pontos"]
        ),
      },
      narrow: { type: "boolean", label: "Linha curta, centralizada" },
    },
    defaults: { style: "line", narrow: false },
  },

  Space: {
    label: "Espaço",
    category: "estrutura",
    description: "Espaço em branco entre seções.",
    fields: {
      size: {
        type: "select",
        label: "Tamanho",
        options: opt(["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"]),
      },
    },
    defaults: { size: "md" },
  },

  Footer: {
    label: "Rodapé",
    category: "estrutura",
    description:
      "Rodapé com colunas de links e texto legal. Use uma vez, como último bloco.",
    fields: {
      brand: { type: "text", label: "Marca" },
      tagline: { type: "text", label: "Frase" },
      columns: {
        type: "list",
        label: "Colunas",
        summary: "title",
        max: 4,
        item: {
          title: { type: "text", label: "Título" },
          links: {
            type: "textarea",
            label: "Links (um por linha, formato Texto | link)",
          },
        },
      },
      legal: { type: "text", label: "Texto legal" },
    },
    defaults: {
      brand: "Marca",
      tagline: "",
      columns: [
        { title: "Produto", links: "Visão geral | #\nEspecificações | #specs" },
        { title: "Empresa", links: "Sobre | #\nContato | #contato" },
      ],
      legal: "Todos os direitos reservados.",
    },
  },
} satisfies Record<string, BlockDef>;

export type BlockName = keyof typeof blocks;
export const blockNames = Object.keys(blocks) as BlockName[];

/* ------------------------------------------------------------------ */
/* Page settings (root)                                                 */
/* ------------------------------------------------------------------ */

export const rootFields = {
  title: { type: "text", label: "Título da página (Google e aba)" },
  description: { type: "textarea", label: "Descrição para o Google" },
  ogImage: { type: "image", label: "Imagem ao compartilhar o link" },
  theme: {
    type: "select",
    label: "Tema",
    help: "auto segue o modo claro/escuro do aparelho de quem visita",
    options: opt(
      ["light", "Claro"],
      ["dark", "Escuro"],
      ["auto", "Automático"]
    ),
  },
  accent: { type: "color", label: "Cor de destaque" },
  bgColor: {
    type: "color",
    label: "Cor de fundo da página",
    optional: true,
    help: "vazio = padrão do tema",
  },
  textColor: {
    type: "color",
    label: "Cor do texto",
    optional: true,
    help: "vazio = padrão do tema",
  },
  font: {
    type: "select",
    label: "Combinação de fontes",
    help: "clean = sem serifa neutra; editorial = títulos serifados; geometric = títulos geométricos. headingFont e bodyFont sobrepõem a combinação",
    options: opt(
      ["clean", "Limpa (Inter)"],
      ["editorial", "Editorial (serifada)"],
      ["geometric", "Geométrica"]
    ),
  },
  headingFont: {
    type: "select",
    label: "Fonte dos títulos",
    options: [{ value: "auto", label: "Da combinação" }, ...fontOptions],
  },
  bodyFont: {
    type: "select",
    label: "Fonte do texto",
    options: [{ value: "auto", label: "Da combinação" }, ...fontOptions],
  },
  headingWeight: {
    type: "select",
    label: "Peso dos títulos",
    options: opt(
      ["auto", "Da fonte"],
      ["400", "Regular"],
      ["500", "Médio"],
      ["600", "Semi-negrito"],
      ["700", "Negrito"],
      ["800", "Extra negrito"]
    ),
  },
  titleScale: {
    type: "select",
    label: "Tamanho dos títulos",
    options: opt(
      ["sm", "Menores"],
      ["md", "Padrão"],
      ["lg", "Maiores"],
      ["xl", "Enormes"]
    ),
  },
  radius: {
    type: "select",
    label: "Cantos arredondados",
    options: opt(
      ["none", "Retos"],
      ["sm", "Discretos"],
      ["md", "Padrão"],
      ["lg", "Redondos"],
      ["xl", "Bem redondos"]
    ),
  },
  buttonShape: {
    type: "select",
    label: "Formato dos botões",
    options: opt(
      ["pill", "Cápsula"],
      ["rounded", "Arredondado"],
      ["square", "Reto"]
    ),
  },
  contentWidth: {
    type: "select",
    label: "Largura do conteúdo",
    options: opt(
      ["narrow", "Estreita"],
      ["normal", "Normal"],
      ["wide", "Larga"]
    ),
  },
  density: {
    type: "select",
    label: "Espaço entre seções",
    options: opt(
      ["compact", "Compacto"],
      ["normal", "Normal"],
      ["airy", "Arejado"]
    ),
  },
  animations: {
    type: "boolean",
    label: "Animações de rolagem",
    help: "desligar deixa a página estática, sem parallax nem efeitos presos à rolagem",
  },
  customCss: {
    type: "textarea",
    label: "CSS personalizado (avançado)",
    help: "CSS puro aplicado só a esta página. Use as classes .v-site, .v-section, .v-h2, .v-btn… Não aceita @import, scripts nem HTML",
  },
} satisfies Record<string, FieldDef>;

export const rootDefaults = {
  title: "",
  description: "",
  ogImage: "",
  theme: "light",
  accent: "#0071e3",
  bgColor: "",
  textColor: "",
  font: "clean",
  headingFont: "auto",
  bodyFont: "auto",
  headingWeight: "auto",
  titleScale: "md",
  radius: "md",
  buttonShape: "pill",
  contentWidth: "normal",
  density: "normal",
  animations: true,
  customCss: "",
};

export type RootProps = typeof rootDefaults;

/** How the page settings are grouped in the editor sidebar. */
export const rootGroups: {
  label: string;
  keys: (keyof typeof rootFields)[];
  open?: boolean;
}[] = [
  {
    label: "Página e Google",
    keys: ["title", "description", "ogImage"],
    open: true,
  },
  {
    label: "Cores e tema",
    keys: ["theme", "accent", "bgColor", "textColor"],
    open: true,
  },
  {
    label: "Tipografia",
    keys: ["font", "headingFont", "bodyFont", "headingWeight", "titleScale"],
  },
  {
    label: "Formato e espaço",
    keys: ["radius", "buttonShape", "contentWidth", "density"],
  },
  { label: "Avançado", keys: ["animations", "customCss"] },
];

/** Block-specific fields plus the props every block accepts. */
export function fieldsFor(type: BlockName): Record<string, FieldDef> {
  return {
    ...(blocks[type].fields as Record<string, FieldDef>),
    ...commonFields,
  };
}

/** Default props for a block, deep-copied so callers can mutate them. */
export function defaultsFor(type: BlockName): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify({ ...commonDefaults, ...blocks[type].defaults })
  );
}

type LooseBlock = { type: string; props: Record<string, unknown> };
type LoosePage = {
  root: { props: Record<string, unknown> };
  content: LooseBlock[];
};

/**
 * Fill in props a page does not have yet (new fields added after it was
 * saved) with their defaults, so the editor always shows a value. Existing
 * values are never touched.
 */
export function fillDefaults(page: LoosePage): LoosePage {
  const root = { ...rootDefaults, ...page.root.props };
  const content = page.content.map((b) => {
    if (!(b.type in blocks)) return b;
    const defaults = defaultsFor(b.type as BlockName);
    const props: Record<string, unknown> = { ...b.props };
    for (const [k, v] of Object.entries(defaults))
      if (!(k in props)) props[k] = v;
    return { ...b, props };
  });
  return { ...page, root: { ...page.root, props: root }, content };
}
