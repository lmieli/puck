// Starter sites. Each template returns every page of a new site as Puck data.

import { makeBlock, type PageData } from "../ai/page-ops.ts";
import type { BlockName } from "../blocks/schema.ts";
import { rootDefaults } from "../blocks/schema.ts";
import { stock } from "./stock.ts";

const b = (type: BlockName, props: Record<string, unknown> = {}) =>
  makeBlock(type, props);
const img = (i: number) => stock[i].url;

const page = (
  root: Partial<typeof rootDefaults>,
  content: ReturnType<typeof b>[]
): PageData => ({
  root: { props: { ...rootDefaults, ...root } },
  content,
});

export type TemplateId = "produto" | "construtora" | "blank";

export const templates: {
  id: TemplateId;
  name: string;
  description: string;
  preview: string;
}[] = [
  {
    id: "produto",
    name: "Lançamento de produto",
    description:
      "Abertura cinematográfica, produto em 3D girando com a rolagem, parallax e storytelling.",
    preview: img(0),
  },
  {
    id: "construtora",
    name: "Construtora e imóveis",
    description:
      "Empreendimentos, galeria, números, ficha técnica e formulário que salva contatos.",
    preview: img(18),
  },
  {
    id: "blank",
    name: "Em branco",
    description:
      "Menu, abertura e rodapé. Monte o resto com os blocos ou peça para a IA.",
    preview: img(6),
  },
];

export function buildTemplate(
  id: TemplateId,
  name: string
): Record<string, PageData> {
  if (id === "produto") return produto(name);
  if (id === "construtora") return construtora(name);
  return {
    "/": page({ title: name }, [
      b("Nav", {
        brand: name,
        links: [],
        ctaLabel: "Contato",
        ctaHref: "#contato",
      }),
      b("Hero", {
        variant: "minimal",
        eyebrow: "",
        title: `${name}.`,
        subtitle: "Comece a escrever a sua história.",
        buttons: [],
      }),
      b("Footer", {
        brand: name,
        legal: `© ${new Date().getFullYear()} ${name}.`,
      }),
    ]),
  };
}

function produto(name: string): Record<string, PageData> {
  const brand = name;
  return {
    "/": page(
      {
        title: `${brand} — som que desaparece.`,
        description: `${brand}: fone com cancelamento de ruído, 40 horas de bateria e design em alumínio.`,
        theme: "dark",
        accent: "#2997ff",
        font: "clean",
      },
      [
        b("Nav", {
          brand,
          links: [
            { label: "Visão geral", href: "#" },
            { label: "Design", href: "#design" },
            { label: "Som", href: "#som" },
            { label: "Especificações", href: "#specs" },
          ],
          ctaLabel: "Comprar",
          ctaHref: "#comprar",
        }),
        b("Hero", {
          variant: "cinematic",
          eyebrow: "Novo",
          title: "Silêncio.\nNa medida certa.",
          subtitle:
            "Cancelamento de ruído adaptativo, 40 horas de bateria e um design que você esquece que está usando.",
          image: img(0),
          buttons: [
            { label: "Assistir ao filme", href: "#design", style: "primary" },
            { label: "Comprar", href: "#comprar", style: "link" },
          ],
          tone: "auto",
        }),
        b("Reveal", {
          eyebrow: "",
          text: "Tiramos tudo o que atrapalha a música. O ruído da cidade, o peso nos ombros, os fios. O que sobrou foi só você e o som.",
          highlight: "só você e o som",
          tone: "auto",
        }),
        b("Product3D", {
          eyebrow: "Design",
          title: "Esculpido em alumínio.",
          shape: "headphones",
          color: "#d9dce1",
          finish: "metal",
          steps: [
            {
              title: "Arco de alumínio inteiriço",
              text: "Usinado a partir de um único bloco. Leve como uma folha de papel dobrada.",
            },
            {
              title: "Almofadas de espuma com memória",
              text: "Moldam-se à sua cabeça em minutos e isolam sem apertar.",
            },
            {
              title: "Controles invisíveis",
              text: "Toque, deslize, segure. Nenhum botão à vista.",
            },
          ],
          tone: "inverse",
        }),
        b("StickyStory", {
          eyebrow: "Som",
          title: "Ouça o que estava escondido.",
          chapters: [
            {
              eyebrow: "Cancelamento adaptativo",
              title: "O mundo some quando você quer.",
              text: "Seis microfones medem o ruído 48 mil vezes por segundo e o anulam antes de chegar ao seu ouvido.",
              image: img(7),
            },
            {
              eyebrow: "Áudio espacial",
              title: "O palco ao seu redor.",
              text: "Cada instrumento no lugar certo. Vire a cabeça e o som fica onde estava.",
              image: img(14),
            },
            {
              eyebrow: "Modo ambiente",
              title: "Ou deixe o mundo entrar.",
              text: "Um toque e você conversa sem tirar o fone. A voz chega natural, sem chiado.",
              image: img(15),
            },
          ],
          mediaSide: "left",
          tone: "auto",
        }),
        b("Bento", {
          eyebrow: "Por dentro",
          title: "Pequenos detalhes. Grande diferença.",
          intro: "",
          tiles: [
            {
              size: "lg",
              style: "image",
              stat: "",
              title: "Feito para o dia inteiro.",
              text: "290 gramas distribuídas para não cansar.",
              image: img(3),
            },
            {
              size: "sm",
              style: "plain",
              stat: "40h",
              title: "de bateria",
              text: "Com cancelamento ligado.",
              image: "",
            },
            {
              size: "sm",
              style: "accent",
              stat: "5 min",
              title: "de carga = 4 h de música",
              text: "",
              image: "",
            },
            {
              size: "wide",
              style: "dark",
              stat: "",
              title: "Troca automática entre seus aparelhos.",
              text: "Do celular para o notebook sem tocar em nada.",
              image: "",
            },
            {
              size: "md",
              style: "image",
              stat: "",
              title: "Cinco cores.",
              text: "",
              image: img(5),
            },
            {
              size: "md",
              style: "plain",
              stat: "-35 dB",
              title: "de ruído a menos",
              text: "Medido em ambiente de escritório.",
              image: "",
            },
          ],
          tone: "subtle",
        }),
        b("Parallax", {
          image: img(9),
          eyebrow: "",
          title: "Leve a calma\npara onde for.",
          text: "",
          intensity: "medium",
          height: "screen",
        }),
        b("HorizontalScroll", {
          eyebrow: "Cores",
          title: "Escolha a sua.",
          items: [
            {
              image: img(0),
              title: "Grafite",
              text: "Discreto em qualquer lugar.",
            },
            { image: img(3), title: "Prata", text: "O clássico, renovado." },
            { image: img(4), title: "Sol", text: "Para quem chega antes." },
            {
              image: img(5),
              title: "Rosa-areia",
              text: "Suave por fora e por dentro.",
            },
            {
              image: img(1),
              title: "Branco-gelo",
              text: "Limpo como a primeira nota.",
            },
          ],
          tone: "auto",
        }),
        b("Stats", {
          eyebrow: "",
          title: "Números que você sente.",
          items: [
            { value: "40h", label: "de bateria" },
            { value: "290g", label: "de peso" },
            { value: "6", label: "microfones" },
          ],
          tone: "auto",
        }),
        b("Specs", {
          title: "Especificações",
          groups: [
            {
              name: "Som",
              rows: "Drivers: 40 mm dinâmicos\nCancelamento de ruído: adaptativo\nÁudio espacial: sim",
            },
            {
              name: "Bateria",
              rows: "Duração: até 40 horas\nCarga rápida: 5 min = 4 h\nConector: USB-C",
            },
            {
              name: "Design",
              rows: "Peso: 290 g\nMaterial: alumínio e tecido\nCores: 5",
            },
            {
              name: "Conexão",
              rows: "Bluetooth: 5.4\nMultiponto: 2 aparelhos\nAlcance: 10 m",
            },
          ],
          tone: "auto",
        }),
        b("Cta", {
          eyebrow: "",
          title: `${brand}.`,
          text: "Frete grátis e devolução em 30 dias.",
          price: "Preço a definir",
          priceNote: "ou em até 12x sem juros",
          swatches: [
            { name: "Grafite", color: "#2b2d31" },
            { name: "Prata", color: "#d9dce1" },
            { name: "Sol", color: "#f2c94c" },
            { name: "Rosa-areia", color: "#e8c4c0" },
            { name: "Branco-gelo", color: "#f4f5f7" },
          ],
          image: img(1),
          buttons: [
            { label: "Comprar", href: "#", style: "primary" },
            { label: "Comparar modelos", href: "#specs", style: "link" },
          ],
          tone: "subtle",
        }),
        b("Footer", {
          brand,
          tagline: "Som que desaparece.",
          columns: [
            {
              title: "Produto",
              links:
                "Visão geral | #\nDesign | #design\nEspecificações | #specs",
            },
            {
              title: "Suporte",
              links: "Garantia | #\nManual | #\nContato | #",
            },
            { title: "Empresa", links: "Sobre | #\nImprensa | #" },
          ],
          legal: `© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.`,
        }),
      ]
    ),
  };
}

function construtora(name: string): Record<string, PageData> {
  const links = [
    { label: "Empreendimentos", href: "#empreendimentos" },
    { label: "A empresa", href: "#a-empresa" },
    { label: "Contato", href: "/contato" },
  ];
  const footer = () =>
    b("Footer", {
      brand: name,
      tagline: "Construindo com cuidado desde o primeiro tijolo.",
      columns: [
        {
          title: "Navegação",
          links:
            "Empreendimentos | /#empreendimentos\nA empresa | /#a-empresa\nContato | /contato",
        },
        { title: "Atendimento", links: "WhatsApp | #\nE-mail | #" },
      ],
      legal: `© ${new Date().getFullYear()} ${name}.`,
    });
  return {
    "/": page(
      {
        title: `${name} — imóveis planejados`,
        description: `${name}: empreendimentos residenciais e comerciais.`,
        theme: "light",
        accent: "#c8102e",
        font: "editorial",
      },
      [
        b("Nav", {
          brand: name,
          links,
          ctaLabel: "Fale conosco",
          ctaHref: "/contato",
        }),
        b("Hero", {
          variant: "cinematic",
          eyebrow: "Lançamento",
          title: "Um novo jeito\nde morar.",
          subtitle:
            "Apartamentos amplos, bem iluminados e perto de tudo. Agende uma visita ao decorado.",
          image: img(18),
          buttons: [
            {
              label: "Conhecer empreendimentos",
              href: "#empreendimentos",
              style: "primary",
            },
            { label: "Agendar visita", href: "/contato", style: "link" },
          ],
          tone: "auto",
        }),
        b("Stats", {
          eyebrow: "",
          title: "",
          items: [
            { value: "[ano]", label: "de fundação" },
            { value: "[obras]", label: "obras entregues" },
            { value: "[selo]", label: "certificação" },
          ],
          tone: "auto",
        }),
        b("StickyStory", {
          eyebrow: "Empreendimentos",
          title: "Escolha onde começar.",
          chapters: [
            {
              eyebrow: "Residencial",
              title: "Apartamentos de 2 e 3 quartos",
              text: "Plantas inteligentes, varanda e vaga de garagem.",
              image: img(19),
            },
            {
              eyebrow: "Alto padrão",
              title: "Casas com área de lazer",
              text: "Privacidade e espaço para a família crescer.",
              image: img(20),
            },
            {
              eyebrow: "Comercial",
              title: "Salas e lojas",
              text: "Localização de grande movimento para o seu negócio.",
              image: img(17),
            },
          ],
          mediaSide: "right",
          tone: "auto",
        }),
        b("Parallax", {
          image: img(16),
          eyebrow: "",
          title: "Construímos lugares\npara a vida acontecer.",
          text: "",
          intensity: "soft",
          height: "tall",
        }),
        b("Feature", {
          eyebrow: "A empresa",
          title: "Do projeto à entrega das chaves.",
          text: "Cuidamos de cada etapa com equipe própria e acompanhamento transparente da obra.\n\nVocê acompanha o andamento pelo site e fala direto com a construtora.",
          bullets: [
            { text: "Equipe técnica própria" },
            { text: "Negociação direta" },
            { text: "Andamento da obra publicado" },
          ],
          image: img(17),
          reverse: false,
          buttons: [
            {
              label: "Falar com um especialista",
              href: "/contato",
              style: "primary",
            },
          ],
          tone: "subtle",
        }),
        b("Gallery", {
          eyebrow: "Decorado",
          title: "Ambientes que acolhem.",
          images: [
            { src: img(19), caption: "Sala de estar" },
            { src: img(18), caption: "Fachada" },
            { src: img(20), caption: "Área de lazer" },
          ],
          columns: "3",
          tone: "auto",
        }),
        b("Faq", {
          title: "Perguntas frequentes",
          items: [
            {
              question: "Posso financiar direto com a construtora?",
              answer: "[Descreva as condições de pagamento.]",
            },
            {
              question: "Como agendo uma visita ao decorado?",
              answer:
                "Preencha o formulário de contato e retornamos no mesmo dia.",
            },
            {
              question: "Quando a obra fica pronta?",
              answer: "[Informe a previsão de entrega.]",
            },
          ],
          tone: "auto",
        }),
        b("Cta", {
          eyebrow: "",
          title: "Venha conhecer pessoalmente.",
          text: "Agende uma visita ao decorado com um de nossos especialistas.",
          price: "",
          priceNote: "",
          swatches: [],
          image: "",
          buttons: [
            { label: "Agendar visita", href: "/contato", style: "primary" },
          ],
          tone: "inverse",
        }),
        footer(),
      ]
    ),
    "/contato": page(
      {
        title: `Contato — ${name}`,
        theme: "light",
        accent: "#c8102e",
        font: "editorial",
      },
      [
        b("Nav", {
          brand: name,
          links,
          ctaLabel: "Fale conosco",
          ctaHref: "/contato",
        }),
        b("Contact", {
          eyebrow: "Contato",
          title: "Vamos conversar.",
          text: "Deixe seus dados e um especialista retorna em até um dia útil.",
          email: "",
          phone: "",
          address: "",
          button: "Enviar",
          success: "Recebemos sua mensagem. Retornamos em breve.",
          tone: "auto",
        }),
        footer(),
      ]
    ),
  };
}
