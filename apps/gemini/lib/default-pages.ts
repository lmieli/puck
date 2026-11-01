// Initial content for every page of the site. Pages edited in /edit and
// published are saved to database.json and take precedence over these.

import type { Data } from "@puckeditor/core";
import type { Components, RootProps } from "../puck.config";
import { images, nav, site } from "./site";

type Block = {
  [K in keyof Components]: { type: K; props: Components[K] & { id: string } };
}[keyof Components];

const page = (root: RootProps, blocks: Block[]): Data => ({
  root: { props: root },
  content: blocks as Data["content"],
});

let seq = 0;
function b<K extends keyof Components>(type: K, props: Components[K]): Block {
  seq += 1;
  return { type, props: { ...props, id: `${type}-${seq}` } } as Block;
}

/* ---------------------------- shared blocks ---------------------------- */

const header = (overlay = true) =>
  b("Header", {
    logo: site.logo,
    links: nav,
    ctaLabel: "Fale conosco",
    ctaHref: site.whatsappHref,
    overlay,
  });

const footer = () =>
  b("Footer", {
    about:
      "Desde 1972 construindo sonhos e oportunidades em Nova Friburgo e região. Mais de 435 obras residenciais e comerciais entregues.",
    address: site.address,
    district: site.district,
    phones: site.salesPhones.map((number) => ({ number })),
    emails: site.emails,
    links: nav,
    instagram: site.instagram,
    facebook: site.facebook,
    showSeals: true,
  });

const departments = [
  {
    name: "Vendas",
    email: "comercial@geminiengenharia.com.br",
    whatsapp: true,
  },
  {
    name: "Técnico",
    email: "tecnica2@geminiengenharia.com.br",
    whatsapp: false,
  },
  {
    name: "Recursos Humanos",
    email: "pessoal@geminiengenharia.com.br",
    whatsapp: false,
  },
];

const contact = (subject: string, title: string, intro: string) =>
  b("Contact", {
    eyebrow: "Atendimento",
    title,
    intro,
    subject,
    address: `${site.address} – ${site.district}`,
    hours: "",
    phones: site.salesPhones.map((number) => ({ number })),
    departments,
    tone: "sand",
  });

const villaPlaces = [
  "Supermercado",
  "Agências bancárias",
  "Correios",
  "Postos de combustível",
  "Centro automotivo",
  "Área comercial",
  "Complexo Arena",
  "Estádio do Friburguense",
  "Circuito Gastronômico do Cônego",
  "Villa Boulevard Centro Empresarial",
  "Acesso à Via Expressa",
  "Centro de Nova Friburgo",
].map((name) => ({ name }));

const villaDasFlores = (tone: "light" | "sand" = "light") =>
  b("Nearby", {
    eyebrow: "Villa das Flores",
    title: "Morar, trabalhar ou investir no Villa das Flores",
    text: "Um complexo planejado de áreas residenciais e comerciais, com a segurança e a tranquilidade de um condomínio fechado.\n\nFica em uma área privilegiada de Nova Friburgo, ligando a Via Expressa à Av. Júlio Antônio Thurler – perto de tudo o que você precisa no dia a dia.",
    address:
      "Rua Américo de Castro Pimentel – Villa das Flores, Olaria, Nova Friburgo – RJ, CEP 28620-033",
    places: villaPlaces,
    image: images.villaDasFloresMap,
    mapQuery: "",
    tone,
  });

const portfolioItems = [
  {
    image: images.portfolio.pauloHenrique,
    title: "Residencial Paulo Henrique Magalhães",
    category: "Residencial",
    location: "Centro, Nova Friburgo – RJ",
  },
  {
    image: images.portfolio.caixa,
    title: "Caixa Econômica Federal",
    category: "Comercial",
    location: "Centro, Nova Friburgo – RJ",
  },
  {
    image: images.portfolio.juvenalFolly,
    title: "Ed. Juvenal Folly",
    category: "Residencial",
    location: "Centro, Nova Friburgo – RJ",
  },
  {
    image: images.portfolio.florDeLis,
    title: "Ed. Flor de Lis",
    category: "Residencial",
    location: "Olaria, Nova Friburgo – RJ",
  },
  {
    image: images.portfolio.unimed,
    title: "Hospital Unimed Nova Friburgo",
    category: "Comercial",
    location: "Chácara do Paraíso, Nova Friburgo – RJ",
  },
  {
    image: images.portfolio.willisau,
    title: "Willisau Center",
    category: "Reforma",
    location: "Centro, Nova Friburgo – RJ",
  },
  {
    image: images.portfolio.blueMarine,
    title: "Residencial Blue Marine",
    category: "Residencial",
    location: "Extensão do Bosque, Rio das Ostras – RJ",
  },
  {
    image: images.portfolio.mezaninos,
    title: "Ed. Mezanino's",
    category: "Comercial",
    location: "Centro, Nova Friburgo – RJ",
  },
];

const propertyCards = [
  {
    image: images.bougainvilleFacade,
    status: "Últimas unidades",
    title: "Residencial Bougainville",
    kind: "Residencial · Villa das Flores",
    location: "Olaria, Nova Friburgo – RJ",
    specs: "3 quartos · Coberturas duplex · 2 vagas · 2 elevadores",
    href: "/residencial-bougainville",
  },
  {
    image: images.gardenia,
    status: "Pronto para morar",
    title: "Residencial Gardênia",
    kind: "Residencial · Villa das Flores",
    location: "Olaria, Nova Friburgo – RJ",
    specs: "2 e 3 quartos · Suíte · Elevador · Salão de festas",
    href: "/residencial-gardenia",
  },
  {
    image: images.boulevard,
    status: "Lojas e salas",
    title: "Villa Boulevard",
    kind: "Comercial · Centro Empresarial",
    location: "Via Expressa, Olaria – Nova Friburgo",
    specs: "12 lojas · 59 salas · 2 elevadores",
    href: "/villa-boulevard",
  },
];

const stageTexts: [string, string][] = [
  [
    "Locação",
    "Primeira etapa: o terreno é preparado e o projeto é marcado no local exato onde o prédio vai nascer.",
  ],
  [
    "Estaqueamento",
    "Demarcação e execução das estacas que definem exatamente como será a fundação.",
  ],
  [
    "Fundação",
    "Construção das estruturas subterrâneas que mantêm o prédio estável e suportam todo o seu peso.",
  ],
  [
    "Estrutura",
    "Execução de vigas, pilares e lajes – o esqueleto que sustenta todo o empreendimento.",
  ],
  [
    "Instalações elétricas e hidrossanitárias",
    "Tubulações de água e esgoto, caixas de passagem, eletrodutos e ligações internas.",
  ],
  [
    "Alvenaria",
    "Paredes que vedam os espaços e garantem proteção térmica e acústica.",
  ],
  [
    "Acabamento",
    "Massa, pintura, pisos, bancadas, louças e metais, fachada e paisagismo.",
  ],
  ["Telhado", "Estrutura e aplicação da cobertura."],
];

const stages = (percents: number[]) =>
  stageTexts.map(([title, text], i) => ({
    title,
    text,
    percent: percents[i] ?? 0,
  }));

const interiors = [
  { src: images.living, caption: "Sala ampliada" },
  { src: images.kitchen, caption: "Cozinha" },
  { src: images.bedroom, caption: "Quarto" },
  { src: images.homeOffice, caption: "Home office" },
  { src: images.living2, caption: "Sala de estar" },
  { src: images.bathroom, caption: "Banheiro" },
  { src: images.living3, caption: "Sala de jantar" },
];

/* -------------------------------- pages -------------------------------- */

const home = page(
  {
    title: "Gemini Engenharia – Construindo sonhos em Nova Friburgo desde 1972",
    description:
      "Desde 1972, a Gemini Engenharia constrói sonhos em Nova Friburgo e região. Mais de 435 obras. Conheça o Residencial Bougainville, o Gardênia e o Villa Boulevard.",
    whatsapp: true,
  },
  [
    header(true),
    b("Hero", {
      image: images.bougainvilleFacade,
      eyebrow: "Residencial Bougainville · Villa das Flores",
      title: "Agora só falta você.",
      description:
        "Os últimos apartamentos de 3 quartos e coberturas duplex do Residencial Bougainville esperam pela sua família. Conforto, modernidade e qualidade de vida em um só lugar.",
      buttons: [
        {
          label: "Conhecer o Bougainville",
          href: "/residencial-bougainville",
          variant: "primary",
        },
        {
          label: "Falar no WhatsApp",
          href: site.whatsappHref,
          variant: "whatsapp",
        },
      ],
      highlights: [
        { icon: "bed", label: "3 quartos" },
        { icon: "layers", label: "Coberturas duplex" },
        { icon: "car", label: "2 vagas" },
        { icon: "elevator", label: "2 elevadores" },
        { icon: "sun", label: "Todos com varanda" },
      ],
      badge: "Últimas unidades",
      height: "tall",
      align: "left",
    }),
    b("Stats", {
      items: [
        { value: "1972", label: "Construindo desde" },
        { value: "50+", label: "Anos de história" },
        { value: "435+", label: "Obras realizadas" },
        { value: "ISO 9001", label: "e PBQP-H certificados" },
      ],
      tone: "light",
      overlap: true,
    }),
    b("Properties", {
      eyebrow: "Imóveis à venda",
      title: "Encontre o seu próximo endereço",
      intro:
        "Residenciais e salas comerciais no Villa das Flores, o bairro planejado que mais cresce em Nova Friburgo. Negociação direto com a construtora.",
      items: propertyCards,
      tone: "light",
    }),
    b("Split", {
      eyebrow: "Destaque",
      title: "Viva o Bougainville",
      text: "O Residencial Bougainville une conforto, modernidade e qualidade de vida em um único lugar. Pensado nos mínimos detalhes, foi projetado para oferecer espaços inteligentes e bem distribuídos.\n\nEscolher o Bougainville é optar por uma nova forma de viver no Villa das Flores, onde cada detalhe foi pensado para proporcionar conforto, segurança e bem-estar.",
      bullets: [
        { text: "Apartamentos lineares de 3 quartos" },
        { text: "Coberturas duplex de 3 e 4 quartos" },
        { text: "Duas vagas de garagem por apartamento" },
        { text: "Dois elevadores e todos os apartamentos com varanda" },
      ],
      buttons: [
        {
          label: "Ver plantas e fotos",
          href: "/residencial-bougainville",
          variant: "secondary",
        },
      ],
      image: images.living,
      imageAlt: "Sala ampliada do Residencial Bougainville",
      secondImage: images.kitchen,
      caption: "Imagens ilustrativas do apartamento decorado",
      reverse: false,
      tone: "sand",
    }),
    villaDasFlores("light"),
    b("Portfolio", {
      eyebrow: "Empreendimentos realizados",
      title: "Mais de 435 obras que fazem parte de Nova Friburgo",
      intro:
        "Edifícios residenciais, comerciais, hospitais e reformas. Desde 1972, com compromisso e qualidade.",
      items: portfolioItems,
      tone: "sand",
    }),
    b("Cta", {
      eyebrow: "Agende uma visita",
      title: "Venha conhecer o Villa das Flores pessoalmente",
      text: "Agende uma visita acompanhada de um de nossos especialistas e veja de perto cada detalhe.",
      buttons: [
        { label: "Agendar visita", href: "/contato", variant: "primary" },
        { label: "WhatsApp", href: site.whatsappHref, variant: "whatsapp" },
      ],
      image: images.villaDasFlores,
    }),
    footer(),
  ]
);

const empresa = page(
  {
    title: "A empresa – Gemini Engenharia",
    description:
      "A Gemini Engenharia atua em Nova Friburgo e região desde 1972, com projetos residenciais e comerciais e certificações ISO 9001 e PBQP-H.",
    whatsapp: true,
  },
  [
    header(true),
    b("PageHeader", {
      image: images.villaDasFlores,
      eyebrow: "Sobre nós",
      title: "Realizando sonhos desde 1972",
      description:
        "Mais de cinco décadas construindo em Nova Friburgo e região.",
    }),
    b("Split", {
      eyebrow: "Nossa história",
      title: "Uma construtora que faz parte da cidade",
      text: "A Gemini Engenharia atua em Nova Friburgo e região desde 1972. Responsável pela idealização e execução de projetos residenciais e comerciais, tem como objetivo principal satisfazer as expectativas de seus clientes.\n\nA entrega de um empreendimento é uma grande alegria e a nossa maior motivação para novas realizações. Temos orgulho de fazer parte da vida de quem confia em nós.",
      bullets: [],
      buttons: [
        {
          label: "Ver imóveis à venda",
          href: "/#imoveis",
          variant: "secondary",
        },
      ],
      image: images.anniversary,
      imageAlt: "Selo comemorativo de 50 anos da Gemini Engenharia",
      secondImage: "",
      caption: "",
      reverse: true,
      tone: "light",
    }),
    b("Stats", {
      items: [
        { value: "1972", label: "Ano de fundação" },
        { value: "435+", label: "Obras realizadas" },
        { value: "3", label: "Empreendimentos à venda" },
        { value: "2", label: "Certificações de qualidade" },
      ],
      tone: "dark",
      overlap: false,
    }),
    b("Split", {
      eyebrow: "Realizamos seu sonho",
      title: "Seu lar em boas mãos",
      text: "Planejar e construir o imóvel do seu sonho: este é o nosso maior objetivo.\n\nImóveis residenciais e comerciais planejados com o carinho que você merece, do projeto à entrega das chaves.",
      bullets: [
        { text: "Projeto, execução e acompanhamento da obra" },
        { text: "Negociação direto com a construtora" },
        { text: "Andamento da obra publicado no site" },
      ],
      buttons: [
        {
          label: "Acompanhar obras",
          href: "/andamento-da-obra",
          variant: "secondary",
        },
      ],
      image: images.family,
      imageAlt: "Mãe e filha felizes em casa",
      secondImage: images.projects,
      caption: "",
      reverse: false,
      tone: "sand",
    }),
    b("Features", {
      eyebrow: "Qualidade certificada",
      title: "Processos reconhecidos",
      intro:
        "Trabalhamos com padrões de gestão auditados, que garantem qualidade em cada etapa da obra.",
      items: [
        {
          icon: "award",
          title: "ISO 9001",
          text: "Sistema de gestão da qualidade certificado internacionalmente.",
        },
        {
          icon: "shield",
          title: "PBQP-H",
          text: "Programa Brasileiro da Qualidade e Produtividade do Habitat.",
        },
        {
          icon: "hardhat",
          title: "Equipe própria",
          text: "Engenharia e execução acompanhadas de perto em todas as fases.",
        },
      ],
      columns: "3",
      tone: "light",
      align: "center",
    }),
    b("Portfolio", {
      eyebrow: "Portfólio",
      title: "Algumas das nossas obras",
      intro: "",
      items: portfolioItems,
      tone: "sand",
    }),
    footer(),
  ]
);

const bougainville = page(
  {
    title: "Residencial Bougainville – Villa das Flores | Gemini Engenharia",
    description:
      "Apartamentos de 3 quartos e coberturas duplex de 3 e 4 quartos com 2 vagas, 2 elevadores e varanda no Villa das Flores, Nova Friburgo.",
    whatsapp: true,
  },
  [
    header(true),
    b("Hero", {
      image: images.bougainvilleFacade,
      eyebrow: "Villa das Flores · Nova Friburgo",
      title: "Residencial Bougainville",
      description:
        "Conforto, praticidade e uma experiência única de morar. Apartamentos amplos, bem distribuídos e com varanda, perto de tudo.",
      buttons: [
        { label: "Quero saber valores", href: "#contato", variant: "primary" },
        { label: "Ver plantas", href: "#plantas", variant: "ghost" },
      ],
      highlights: [
        { icon: "bed", label: "3 quartos" },
        { icon: "layers", label: "Duplex 3 e 4 quartos" },
        { icon: "car", label: "2 vagas" },
        { icon: "elevator", label: "2 elevadores" },
      ],
      badge: "Últimas unidades",
      height: "tall",
      align: "left",
    }),
    b("Features", {
      eyebrow: "Diferenciais",
      title: "Pensado nos mínimos detalhes",
      intro: "Conheça os principais diferenciais do empreendimento.",
      items: [
        {
          icon: "bed",
          title: "Apartamentos de 3 quartos",
          text: "Plantas lineares, perfeitas para as necessidades da sua família.",
        },
        {
          icon: "layers",
          title: "Coberturas duplex",
          text: "Opções de 3 e 4 quartos – ideais para quem trabalha em home office.",
        },
        {
          icon: "elevator",
          title: "Dois elevadores",
          text: "Mais comodidade e agilidade no seu dia a dia.",
        },
        {
          icon: "car",
          title: "Duas vagas por apartamento",
          text: "Garagem para dois carros, com mais segurança.",
        },
        {
          icon: "sofa",
          title: "Ambientes amplos",
          text: "Espaços bem distribuídos que oferecem conforto em cada cômodo.",
        },
        {
          icon: "sun",
          title: "Todos com varanda",
          text: "Para curtir momentos de lazer e convivência.",
        },
      ],
      columns: "3",
      tone: "light",
      align: "center",
    }),
    b("Gallery", {
      eyebrow: "Decorado",
      title: "Ambientes que acolhem",
      intro: "Toque nas fotos para ampliar.",
      images: interiors,
      layout: "mosaic",
      note: "Imagens ilustrativas. A decoração é sugestiva e não está incluída no preço.",
      tone: "sand",
    }),
    b("Gallery", {
      eyebrow: "Plantas humanizadas",
      title: "Escolha a planta ideal",
      intro:
        "Apartamentos lineares e coberturas duplex. As medidas podem sofrer pequenas alterações.",
      images: images.plans.map((src, i) => ({
        src,
        caption: `Planta ${i + 1}`,
      })),
      layout: "plans",
      note: "",
      tone: "light",
    }),
    villaDasFlores("sand"),
    contact(
      "Residencial Bougainville",
      "Garanta uma das últimas unidades",
      "Nossa equipe de especialistas entra em contato com você – é rapidinho. Consulte valores e condições especiais."
    ),
    footer(),
  ]
);

const gardenia = page(
  {
    title: "Residencial Gardênia – Villa das Flores | Gemini Engenharia",
    description:
      "Apartamentos de 2 quartos e coberturas duplex de 3 quartos com suíte, elevador, garagem coberta e salão de festas no Villa das Flores.",
    whatsapp: true,
  },
  [
    header(true),
    b("Hero", {
      image: images.gardenia,
      eyebrow: "Villa das Flores · Nova Friburgo",
      title: "Residencial Gardênia",
      description:
        "Planejado para você e sua família. Mobilidade, tranquilidade e qualidade de vida ao alcance das mãos.",
      buttons: [
        { label: "Consultar valores", href: "#contato", variant: "primary" },
        { label: "Ficha técnica", href: "#ficha", variant: "ghost" },
      ],
      highlights: [
        { icon: "bed", label: "2 quartos com suíte" },
        { icon: "layers", label: "Duplex 3 quartos" },
        { icon: "elevator", label: "Elevador" },
        { icon: "party", label: "Salão de festas" },
      ],
      badge: "",
      height: "medium",
      align: "left",
    }),
    b("Split", {
      eyebrow: "Planejado para você",
      title: "Realize seu projeto de vida no Gardênia",
      text: "Pertinho das mais variadas opções de comércio, serviços e entretenimento, para muito mais praticidade no dia a dia. E ainda dá para aproveitar as delícias do Circuito Gastronômico do Cônego.\n\nApartamentos de dois ou três quartos com excelente acabamento, em prédio com elevador, garagem coberta e salão de festas.",
      bullets: [
        { text: "2 quartos com 1 suíte – 74 m²" },
        { text: "Cobertura duplex de 3 quartos com suíte – 112 m²" },
        { text: "Elevador, garagem coberta e salão de festas" },
      ],
      buttons: [
        {
          label: "Falar com especialista",
          href: "#contato",
          variant: "secondary",
        },
      ],
      image: images.gardenia3d,
      imageAlt: "Fachada do Residencial Gardênia",
      secondImage: images.gardeniaApt[0],
      caption: "Fotos da cobertura decorada por Jade Azevedo",
      reverse: true,
      tone: "light",
    }),
    b("Specs", {
      eyebrow: "Ficha técnica",
      title: "Plantas e acabamentos",
      intro:
        "Plantas humanizadas por Gabriel Cecon. As medidas podem sofrer pequenas alterações.",
      units: [
        {
          image: images.gardeniaPlan2,
          name: "Apartamento 2 quartos",
          subtitle: "1 suíte",
          rows: "Área de construção: 74 m²\nVaranda: 4,41 m²\nVagas de garagem: 1",
        },
        {
          image: images.gardeniaPlan3,
          name: "Cobertura duplex 3 quartos",
          subtitle: "1 suíte · planta do pavimento inferior",
          rows: "Área de construção: 112 m²\nVaranda: 13,38 m²\nVagas de garagem: 2",
        },
      ],
      finishes: [
        { icon: "sofa", label: "Sala e cozinha", value: "Piso em porcelanato" },
        { icon: "bed", label: "Quartos", value: "Piso laminado" },
        { icon: "sun", label: "Ar-condicionado", value: "Previsão instalada" },
        {
          icon: "check",
          label: "Cozinha",
          value: "Abastecimento GLP para fogão e torneira",
        },
        {
          icon: "check",
          label: "Banheiros",
          value: "Abastecimento GLP para chuveiro e torneira",
        },
        { icon: "car", label: "Garagem", value: "Coberta" },
      ],
      tone: "sand",
    }),
    b("Gallery", {
      eyebrow: "Cobertura decorada",
      title: "Por dentro do Gardênia",
      intro: "Decoração de Jade Azevedo.",
      images: images.gardeniaApt.map((src, i) => ({
        src,
        caption: `Cobertura – foto ${i + 1}`,
      })),
      layout: "grid",
      note: "As ilustrações têm caráter promocional. A decoração é sugestiva e não está incluída no preço.",
      tone: "light",
    }),
    villaDasFlores("sand"),
    contact(
      "Residencial Gardênia",
      "Conheça melhor o Residencial Gardênia",
      "Preencha o formulário e nossa equipe de especialistas entra em contato com você."
    ),
    footer(),
  ]
);

const boulevard = page(
  {
    title:
      "Villa Boulevard Centro Empresarial – Lojas e salas | Gemini Engenharia",
    description:
      "12 lojas com pé-direito duplo e 59 salas comerciais na Via Expressa, em Olaria, Nova Friburgo. Pagamento facilitado direto com a construtora.",
    whatsapp: true,
  },
  [
    header(true),
    b("Hero", {
      image: images.boulevard,
      eyebrow: "Centro Empresarial · Olaria",
      title: "Villa Boulevard: seu negócio no melhor lugar",
      description:
        "Lojas e salas comerciais em um prédio moderno, de fácil acesso e com estacionamento próximo. Um grande investimento – últimas unidades.",
      buttons: [
        { label: "Agendar visita", href: "#contato", variant: "primary" },
        { label: "WhatsApp", href: site.whatsappHref, variant: "whatsapp" },
      ],
      highlights: [
        { icon: "store", label: "12 lojas" },
        { icon: "briefcase", label: "59 salas" },
        { icon: "elevator", label: "2 elevadores" },
        { icon: "parking", label: "Estacionamento" },
      ],
      badge: "Últimas unidades",
      height: "medium",
      align: "left",
    }),
    b("Split", {
      eyebrow: "Um grande investimento",
      title: "Atenda seus clientes em um ambiente moderno",
      text: "O Villa Boulevard é o mais novo empreendimento comercial da Gemini Engenharia. São 12 lojas amplas, com pé-direito duplo – que permite usar o dobro da área – e 59 salas comerciais com excelente estrutura.\n\nFica na Via Expressa, em Olaria, perto de pontos comerciais com fluxo intenso de pessoas todos os dias. Agora só falta você: saia do aluguel e venha conhecer sua nova loja ou sala.",
      bullets: [],
      buttons: [
        { label: "Quero investir", href: "#contato", variant: "secondary" },
      ],
      image: images.boulevardPhoto,
      imageAlt: "Fachada do Villa Boulevard",
      secondImage: "",
      caption: "",
      reverse: false,
      tone: "light",
    }),
    b("Features", {
      eyebrow: "Vantagens",
      title: "Por que o Villa Boulevard",
      intro: "",
      items: [
        {
          icon: "pin",
          title: "Acesso facilitado",
          text: "Na Via Expressa, pertinho do Centro de Nova Friburgo.",
        },
        {
          icon: "parking",
          title: "Estacionamento rotativo",
          text: "Mais conforto para seus clientes.",
        },
        {
          icon: "users",
          title: "Movimento o dia todo",
          text: "No bairro mais populoso da cidade, com centenas de pessoas circulando.",
        },
        {
          icon: "store",
          title: "Lojas com pé-direito duplo",
          text: "O dobro de área útil para o seu negócio.",
        },
        {
          icon: "ruler",
          title: "Salas com medidas variáveis",
          text: "Escolha o tamanho certo para a sua empresa.",
        },
        {
          icon: "coins",
          title: "Direto com a construtora",
          text: "Pagamento facilitado e negociação sem intermediários.",
        },
      ],
      columns: "3",
      tone: "sand",
      align: "center",
    }),
    b("Gallery", {
      eyebrow: "Galeria",
      title: "Conheça o empreendimento",
      intro: "",
      images: images.boulevardGallery.map((src, i) => ({
        src,
        caption: `Villa Boulevard – foto ${i + 1}`,
      })),
      layout: "mosaic",
      note: "",
      tone: "light",
    }),
    villaDasFlores("sand"),
    contact(
      "Villa Boulevard",
      "Garanta sua loja ou sala comercial",
      "Pagamento facilitado direto com a construtora. Fale com a nossa equipe."
    ),
    footer(),
  ]
);

const obras = page(
  {
    title: "Andamento das obras – Gemini Engenharia",
    description:
      "Acompanhe etapa por etapa o andamento das obras do Residencial Bougainville e do Residencial Gardênia.",
    whatsapp: true,
  },
  [
    header(true),
    b("PageHeader", {
      image: images.bougainvilleWorks,
      eyebrow: "Transparência",
      title: "Andamento das obras",
      description: "Acompanhe cada etapa da construção do seu imóvel.",
    }),
    b("Progress", {
      eyebrow: "Em construção",
      title: "Residencial Bougainville",
      intro: "",
      image: images.bougainvilleWorks2,
      updated: "",
      stages: stages([100, 100, 100, 34, 0, 0, 0, 0]),
      tone: "light",
    }),
    b("Progress", {
      eyebrow: "Obra entregue",
      title: "Residencial Gardênia",
      intro: "",
      image: images.gardenia2,
      updated: "",
      stages: stages([100, 100, 100, 100, 100, 100, 100, 100]),
      tone: "sand",
    }),
    b("Cta", {
      eyebrow: "Ficou com alguma dúvida?",
      title: "Fale com a nossa equipe técnica",
      text: "Estamos à disposição para explicar cada fase da obra.",
      buttons: [
        { label: "Entrar em contato", href: "/contato", variant: "primary" },
      ],
      image: images.bougainvilleWorks3,
    }),
    footer(),
  ]
);

const contato = page(
  {
    title: "Contato – Gemini Engenharia",
    description:
      "Fale com a Gemini Engenharia: vendas, setor técnico e recursos humanos. Nova Friburgo – RJ.",
    whatsapp: true,
  },
  [
    header(true),
    b("PageHeader", {
      image: images.villaDasFloresBalcony,
      eyebrow: "Contato",
      title: "Entre em contato conosco",
      description:
        "Preencha o formulário ou fale direto com um de nossos canais de atendimento.",
    }),
    b("Contact", {
      eyebrow: "Atendimento",
      title: "Como podemos ajudar?",
      intro:
        "Escolha o setor e envie sua mensagem. Para vendas, a conversa continua no WhatsApp.",
      subject: "",
      address: `${site.address} – ${site.district}`,
      hours: "",
      phones: [{ number: site.phone }, { number: site.whatsapp }],
      departments: [
        ...departments,
        {
          name: "Administração",
          email: "comercial@geminiengenharia.com.br",
          whatsapp: false,
        },
      ],
      tone: "light",
    }),
    b("Nearby", {
      eyebrow: "Onde estamos",
      title: "Venha nos visitar",
      text: "Nosso escritório fica no Parque São Clemente, em Nova Friburgo.",
      address: `${site.address} – ${site.district}`,
      places: [],
      image: "",
      mapQuery: "Rua Maria Duque Estrada Laginestra, 900, Nova Friburgo - RJ",
      tone: "sand",
    }),
    footer(),
  ]
);

export const defaultPages: Record<string, Data> = {
  "/": home,
  "/a-empresa": empresa,
  "/residencial-bougainville": bougainville,
  "/residencial-gardenia": gardenia,
  "/villa-boulevard": boulevard,
  "/andamento-da-obra": obras,
  "/contato": contato,
};
