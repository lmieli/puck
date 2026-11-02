// Site de venda do ParkFlow (sistema de gestão de estacionamento).
//
// Os textos vêm da landing page do próprio produto (repositório parkflow, pasta
// site/) e só prometem o que o sistema faz hoje. As imagens são telas de uma
// base de DEMONSTRAÇÃO com dados fictícios; ficam em public/modelos/parkflow e
// são servidas em qualquer domínio (ver proxy.ts). Nunca troque por capturas da
// unidade real: elas têm placas de clientes.

import { makeBlock, type PageData } from "../ai/page-ops.ts";
import type { BlockName } from "../blocks/schema.ts";
import { rootDefaults } from "../blocks/schema.ts";
import { EMPTY_SEO, type Seo } from "./seo.ts";

export const PARKFLOW_SLUG = "parkflow";
export const PARKFLOW_NAME = "ParkFlow";
/** Endereço do sistema na nuvem (botão "Entrar", para quem já é cliente). */
export const PARKFLOW_APP_URL = "https://parkflow.easiertech.com.br";

const b = (type: BlockName, props: Record<string, unknown> = {}) =>
  makeBlock(type, props);
const shot = (name: string) => `/modelos/parkflow/${name}.webp`;

const ACCENT = "#2563eb";

// As imagens são telas do sistema (proporções variadas): aparecem inteiras, sem
// recorte, em vez do enquadramento de foto padrão dos blocos.
const SCREENSHOT_CSS = `.v-feature-media { aspect-ratio: auto; background: transparent; box-shadow: 0 1px 2px rgb(15 23 42 / .06), 0 18px 48px rgb(15 23 42 / .12); }
.v-feature-img { height: auto !important; object-fit: contain; }
.v-story-img { object-fit: contain; }`;

export function parkflowPages(): Record<string, PageData> {
  const year = new Date().getFullYear();
  const nav = b("Nav", {
    brand: PARKFLOW_NAME,
    links: [
      { label: "Recursos", href: "#recursos" },
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Para quem", href: "#para-quem" },
      { label: "Perguntas", href: "#perguntas" },
      { label: "Entrar", href: PARKFLOW_APP_URL },
    ],
    ctaLabel: "Pedir demonstração",
    ctaHref: "#contato",
  });

  const content = [
    nav,
    b("Hero", {
      variant: "minimal",
      eyebrow: "Gestão de estacionamento com leitura de placa",
      title: "Seu estacionamento\nsob controle.",
      subtitle:
        "O ParkFlow lê a placa pela câmera, emite o ticket com QR code, cobra na saída e mostra o faturamento em tempo real. E continua funcionando quando a internet cai.",
      image: "",
      titleSize: "md",
      buttons: [
        { label: "Pedir demonstração", href: "#contato", style: "primary" },
        { label: "Ver como funciona", href: "#recursos", style: "link" },
      ],
      tone: "auto",
      spaceBottom: "sm",
    }),
    b("Image", {
      image: shot("painel"),
      alt: "Painel do ParkFlow com ocupação, faturamento, fluxo por hora e passagens em tempo real",
      caption: "Painel do dono. Tela com dados fictícios, para demonstração.",
      ratio: "auto",
      fit: "contain",
      widthPct: 100,
      rounded: true,
      tone: "auto",
      width: "wide",
      spaceTop: "none",
      animation: "zoom",
    }),
    b("Cards", {
      eyebrow: "",
      title: "",
      intro: "",
      columns: "4",
      cardStyle: "flat",
      items: [
        {
          image: "",
          title: "Funciona sem internet",
          text: "A portaria segue operando e tudo sincroniza sozinho quando a conexão volta.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Leitura de placa no equipamento",
          text: "A leitura roda no computador da unidade: sem cobrança por leitura e sem depender da internet.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Prova de cada passagem",
          text: "Foto na entrada e na saída e registro de quem fez o quê.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "O dono vê de qualquer lugar",
          text: "Faturamento, pátio e relatórios de todas as unidades.",
          linkLabel: "",
          href: "",
        },
      ],
      tone: "subtle",
    }),
    b("Reveal", {
      eyebrow: "O que muda no seu dia",
      text: "Ticket perdido, saída sem pagamento, caixa sem conferência, mensalista na planilha e o resultado do dia só no fim do dia. O ParkFlow resolve cada uma dessas dores na rotina da portaria: menos papel, menos fila e menos receita escapando.",
      highlight: "menos papel, menos fila e menos receita escapando",
      tone: "auto",
    }),
    b("Specs", {
      title: "Antes e depois do ParkFlow",
      groups: [
        {
          name: "Receita",
          rows: "Antes: ticket perdido, saída sem pagamento, caixa sem conferência\nCom o ParkFlow: foto e ticket de cada passagem, cobrança calculada pelo sistema e caixa conferido",
        },
        {
          name: "Portaria",
          rows: "Antes: um operador só para emitir ticket e abrir a cancela\nCom o ParkFlow: entrada e saída pela placa; o operador atua só nas exceções",
        },
        {
          name: "Clientes especiais",
          rows: "Antes: mensalistas e parceiros controlados em planilha\nCom o ParkFlow: cadastro por placa, desconto automático e controle de inadimplência",
        },
        {
          name: "Resultado",
          rows: "Antes: o resultado do dia só aparece no fim do dia\nCom o ParkFlow: painel em tempo real, de qualquer lugar, com todas as unidades",
        },
      ],
      tone: "auto",
    }),
    b("Feature", {
      anchor: "recursos",
      eyebrow: "Recursos",
      title: "Entrada e saída pela placa, sem digitar nada.",
      text: "A câmera lê a placa, o ticket sai impresso com QR code e a cobrança é calculada na saída.",
      bullets: [
        {
          text: "Ticket impresso na hora, com marca, modelo e cor do veículo identificados por inteligência artificial",
        },
        {
          text: "Na saída, o valor aparece pronto: o operador só recebe em dinheiro, Pix, débito ou crédito",
        },
        {
          text: "Comprovante de pagamento impresso e leitor de QR code opcional na saída",
        },
        {
          text: "Só dá saída com leitura confiável; as duvidosas vão para conferência do operador",
        },
      ],
      image: shot("resultado_saida"),
      reverse: false,
      buttons: [],
      tone: "auto",
    }),
    b("Feature", {
      eyebrow: "Pátio ao vivo",
      title: "Quem está no pátio, há quanto tempo e quanto vai pagar.",
      text: "Uma visão ao vivo do estacionamento, com busca por placa ou ticket e ações a um clique.",
      bullets: [
        {
          text: "Placa, marca, modelo, cor e tipo de cada cliente: rotativo, mensalista ou convênio",
        },
        {
          text: "Corrigir placa, tratar ticket perdido ou liberar com motivo registrado",
        },
        {
          text: "Não tem cancela? O carro que sai sem pagar vira uma pendência controlada, com a hora em que a câmera o viu",
        },
      ],
      image: shot("patio"),
      reverse: true,
      buttons: [],
      tone: "subtle",
    }),
    b("Feature", {
      eyebrow: "Mensalistas e convênios",
      title: "Mensalistas e convênios sem planilha.",
      text: "Cadastre quem tem condição especial e deixe o sistema aplicar a regra sozinho pela placa.",
      bullets: [
        {
          text: "Desconto em porcentagem ou em reais, minutos grátis ou isenção total",
        },
        {
          text: "“Conta do parceiro”: a loja paga e você acompanha o valor a receber",
        },
        {
          text: "Limite de vagas por cliente, por exemplo duas placas e uma vaga",
        },
        {
          text: "Mensalidades com vencimento, carência e controle de inadimplência",
        },
      ],
      image: shot("convenios"),
      reverse: false,
      buttons: [],
      tone: "auto",
    }),
    b("Feature", {
      eyebrow: "Para o dono",
      title: "O dono acompanha tudo, de qualquer lugar.",
      text: "Cada unidade funciona sozinha e envia os dados para a nuvem. Você vê o resultado no computador ou no celular.",
      bullets: [
        {
          text: "Faturamento do dia e da semana, ocupação, permanência média e taxa de passagens sem intervenção",
        },
        {
          text: "Várias unidades num só lugar, com relatórios e exportação para planilha",
        },
        {
          text: "Auditoria de quem fez o quê, incluindo aberturas manuais e cortesias com motivo",
        },
      ],
      image: shot("painel"),
      reverse: true,
      buttons: [],
      tone: "subtle",
    }),
    b("Feature", {
      eyebrow: "Assistente de IA",
      title: "Um assistente que ajuda a configurar.",
      text: "Em vez de procurar em menus, peça em português. O assistente tira dúvidas e prepara as mudanças para você aprovar.",
      bullets: [
        {
          text: "Procura as câmeras e impressoras da rede e ajuda a configurá-las",
        },
        {
          text: "Propõe preços, tolerância, convênios e prazos, mostrando como ficam os valores antes e depois",
        },
        {
          text: "Nada muda sem o seu clique em “Aplicar”, e tudo fica registrado na auditoria",
        },
      ],
      image: shot("assistente"),
      reverse: false,
      buttons: [
        { label: "Pedir demonstração", href: "#contato", style: "primary" },
      ],
      tone: "auto",
    }),
    b("Text", {
      eyebrow: "",
      title: "",
      body: "As telas desta página usam dados fictícios, para demonstração: nenhuma placa ou cliente real aparece aqui.",
      size: "sm",
      align: "center",
      buttons: [],
      tone: "auto",
      spaceTop: "none",
      spaceBottom: "sm",
    }),
    b("Cards", {
      eyebrow: "E mais",
      title: "Os detalhes que fazem diferença no dia a dia.",
      intro: "",
      columns: "4",
      cardStyle: "filled",
      items: [
        {
          image: "",
          title: "Caixa conferido",
          text: "Abertura e fechamento, sangria e suprimento, com a diferença calculada.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Tarifas flexíveis",
          text: "Tolerância, períodos, máximo diário, diária e tabela por tipo de veículo.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Impressora térmica",
          text: "Ticket e comprovante impressos direto, por rede, USB ou instalada no Windows.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "QR code e leitor",
          text: "Ticket com QR code lido por leitor óptico USB na saída.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Fotos como prova",
          text: "Imagem de cada passagem, com prazo de guarda configurável.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Usuários e perfis",
          text: "Operador, gerente e administrador, cada um com o acesso que precisa.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Várias unidades",
          text: "Cada estacionamento com seus dados, e a visão geral para o dono.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Segurança",
          text: "Dados separados por empresa, acesso por senha e registro das ações.",
          linkLabel: "",
          href: "",
        },
      ],
      tone: "subtle",
    }),
    b("StickyStory", {
      anchor: "como-funciona",
      eyebrow: "Como funciona",
      title: "Da conversa à operação, com acompanhamento.",
      chapters: [
        {
          eyebrow: "1",
          title: "Conversa e diagnóstico",
          text: "Entendemos a sua operação, o número de entradas e saídas e o que você já tem instalado, e definimos o conjunto de equipamentos. Você não precisa trocar tudo: o ParkFlow usa câmera IP, impressora térmica e, se quiser, o relé da cancela.",
          image: shot("resultado_entrada"),
        },
        {
          eyebrow: "2",
          title: "Instalação e configuração",
          text: "Instalamos a câmera, a impressora e a cancela (opcional). O assistente ajuda a encontrar e configurar os equipamentos.",
          image: shot("assistente"),
        },
        {
          eyebrow: "3",
          title: "Operação acompanhada",
          text: "A portaria passa a rodar sozinha. Você acompanha pelo painel e conta com a gente nos ajustes do começo.",
          image: shot("painel"),
        },
      ],
      mediaSide: "left",
      tone: "auto",
    }),
    b("Cards", {
      anchor: "para-quem",
      eyebrow: "Para quem",
      title: "Feito para quem vive de estacionamento.",
      intro: "",
      columns: "4",
      cardStyle: "outline",
      items: [
        {
          image: "",
          title: "Estacionamentos avulsos",
          text: "Menos custo de portaria e nenhuma receita escapando por ticket perdido.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Redes com várias unidades",
          text: "Todas as unidades num painel só, com auditoria de quem fez o quê.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Comércio e serviços",
          text: "Clínicas, lojas e restaurantes com convênio e validação do ticket pelo parceiro.",
          linkLabel: "",
          href: "",
        },
        {
          image: "",
          title: "Garagens de mensalistas",
          text: "Condomínios comerciais e edifícios, com contratos, vagas e inadimplência sob controle.",
          linkLabel: "",
          href: "",
        },
      ],
      tone: "auto",
    }),
    b("Faq", {
      anchor: "perguntas",
      title: "Perguntas frequentes",
      items: [
        {
          question: "Preciso de internet?",
          answer:
            "O dia a dia (entrada, saída, caixa e impressão) funciona sem internet, porque cada unidade tem o seu servidor local. A conexão é usada para sincronizar com a nuvem e para o acesso remoto do dono. Quando ela volta, tudo se atualiza sozinho.",
        },
        {
          question: "Preciso ter cancela automática?",
          answer:
            "Não. Com cancela, o sistema pode acioná-la por um relé de rede. Sem cancela, o sistema registra a saída lida pela câmera e, se houver valor a pagar, o operador confirma e o carro fica como pendência de pagamento, com a hora em que foi visto.",
        },
        {
          question: "Quais equipamentos são necessários?",
          answer:
            "Uma câmera IP (com acesso ONVIF/RTSP) para a leitura de placas e uma impressora térmica de 80 mm para o ticket. A cancela é opcional. Na implantação, ajudamos a escolher e configurar o que for preciso.",
        },
        {
          question: "E se a câmera errar a placa?",
          answer:
            "O sistema só emite ticket e dá saída com leitura confiável. Leituras duvidosas vão para conferência do operador, a placa pode ser corrigida em um clique e cada passagem fica com a foto para consulta.",
        },
        {
          question: "Meus dados ficam seguros?",
          answer:
            "Os dados de cada empresa ficam separados dos de outras. O acesso é por usuário e senha com perfis diferentes, as fotos só abrem por links temporários e as ações ficam registradas na auditoria.",
        },
        {
          question: "Atende mais de um estacionamento?",
          answer:
            "Sim. Cada unidade tem o seu servidor e o dono vê todas no mesmo painel, com relatórios por unidade.",
        },
        {
          question: "Quanto custa?",
          answer:
            "O valor depende do número de unidades e dos equipamentos. Fale com a gente para receber uma proposta sob medida.",
        },
      ],
      tone: "subtle",
    }),
    b("Signup", {
      anchor: "contato",
      formName: "Pedido de demonstração",
      layout: "full",
      eyebrow: "Demonstração",
      title: "Veja o ParkFlow funcionando no seu estacionamento.",
      text: "Conte um pouco sobre a sua operação. Retornamos para combinar uma demonstração sem compromisso: mostramos o sistema funcionando, da portaria ao painel do dono, e indicamos o conjunto de equipamentos ideal para o seu caso.",
      fields: [
        { kind: "name", label: "Seu nome", required: true, options: "" },
        { kind: "whatsapp", label: "WhatsApp", required: true, options: "" },
        {
          kind: "company",
          label: "Nome do estacionamento",
          required: false,
          options: "",
        },
        { kind: "city", label: "Cidade", required: false, options: "" },
        {
          kind: "choice",
          label: "Quantas vagas?",
          required: false,
          options:
            "Até 50 vagas\n51 a 150 vagas\n151 a 400 vagas\nMais de 400 vagas\nVárias unidades",
        },
        {
          kind: "longtext",
          label: "Quer contar mais?",
          required: false,
          options: "",
        },
      ],
      button: "Pedir demonstração",
      success:
        "Recebemos o seu pedido. Vamos falar com você para combinar a demonstração.",
      consentOn: true,
      consentText:
        "Concordo em ser contatado sobre a demonstração do ParkFlow. Meus dados são usados só para isso.",
      consentLink: "",
      after: "message",
      afterMessage: "Olá! Acabei de pedir uma demonstração do ParkFlow.",
      tone: "inverse",
    }),
    b("Footer", {
      brand: PARKFLOW_NAME,
      tagline: "Gestão de estacionamentos com leitura de placa.",
      columns: [
        {
          title: "Produto",
          links:
            "Recursos | #recursos\nComo funciona | #como-funciona\nPara quem | #para-quem\nPerguntas | #perguntas",
        },
        {
          title: "Clientes",
          links: `Entrar no sistema | ${PARKFLOW_APP_URL}\nPedir demonstração | #contato`,
        },
      ],
      legal: `© ${year} ParkFlow.`,
    }),
  ];

  return {
    "/": {
      root: {
        props: {
          ...rootDefaults,
          title: "ParkFlow — gestão de estacionamento com leitura de placa",
          description:
            "Sistema de estacionamento com leitura de placa pela câmera, ticket com QR code, cobrança na saída, mensalistas, convênios e painel em tempo real. Funciona sem internet.",
          ogImage: shot("painel"),
          theme: "light",
          accent: ACCENT,
          font: "clean",
          buttonShape: "pill",
          customCss: SCREENSHOT_CSS,
        },
      },
      content,
    },
  };
}

/** Dados de SEO e para agentes de IA (aba "SEO e IAs"). */
export function parkflowSeo(): Seo {
  return {
    ...EMPTY_SEO,
    businessName: PARKFLOW_NAME,
    businessType: "Organization",
    about:
      "O ParkFlow é um sistema de gestão de estacionamento vendido como serviço: leitura automática de placas pela câmera, ticket impresso com QR code, cobrança na saída (dinheiro, Pix, débito e crédito), mensalistas, convênios com lojas parceiras, caixa conferido e painel em tempo real para o dono, com várias unidades. Cada estacionamento tem um servidor local que funciona sem internet e sincroniza com a nuvem.",
    country: "BR",
    areaServed: "Brasil",
  };
}
