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

/** Menu de todas as páginas; nas internas, as âncoras apontam para a página inicial. */
const navBar = (home: "" | "/") =>
  b("Nav", {
    brand: PARKFLOW_NAME,
    links: [
      { label: "Recursos", href: `${home}#recursos` },
      { label: "Mensalistas", href: "/mensalistas" },
      { label: "Convênios", href: "/convenios" },
      { label: "Sem cancela", href: "/sem-cancela" },
      { label: "Perguntas", href: `${home}#perguntas` },
      { label: "Entrar", href: PARKFLOW_APP_URL },
    ],
    ctaLabel: "Pedir demonstração",
    ctaHref: "#contato",
  });

/** Configurações de página (título e descrição para o Google, tema). */
const root = (title: string, description: string, ogImage: string) => ({
  props: {
    ...rootDefaults,
    title,
    description,
    ogImage,
    theme: "light",
    accent: ACCENT,
    font: "clean",
    buttonShape: "pill",
    customCss: SCREENSHOT_CSS,
  },
});

const demoForm = () =>
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
  });

const footer = () =>
  b("Footer", {
    brand: PARKFLOW_NAME,
    tagline: "Gestão de estacionamentos com leitura de placa.",
    columns: [
      {
        title: "Produto",
        links:
          "Recursos | /#recursos\nComo funciona | /#como-funciona\nPara quem | /#para-quem\nPerguntas | /#perguntas",
      },
      {
        title: "Soluções",
        links:
          "Mensalistas | /mensalistas\nConvênios com lojas | /convenios\nEstacionamento sem cancela | /sem-cancela",
      },
      {
        title: "Clientes",
        links: `Entrar no sistema | ${PARKFLOW_APP_URL}\nPedir demonstração | #contato`,
      },
    ],
    legal: `© ${new Date().getFullYear()} ParkFlow.`,
  });

export function parkflowPages(): Record<string, PageData> {
  const nav = navBar("");

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
          linkLabel: "Ver convênios",
          href: "/convenios",
        },
        {
          image: "",
          title: "Garagens de mensalistas",
          text: "Condomínios comerciais e edifícios, com contratos, vagas e inadimplência sob controle.",
          linkLabel: "Ver mensalistas",
          href: "/mensalistas",
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
    demoForm(),
    footer(),
  ];

  return {
    "/": {
      root: root(
        "Sistema para estacionamento com leitura de placa | ParkFlow",
        "Sistema para estacionamento com leitura de placa pela câmera, ticket com QR code, cobrança na saída, mensalistas, convênios e painel em tempo real.",
        shot("painel")
      ),
      content,
    },
    ...subPages(),
  };
}

/* ------------------------------------------------------------------ */
/* Páginas de solução (uma busca específica cada): mensalistas,          */
/* convênios e estacionamento sem cancela.                               */
/* ------------------------------------------------------------------ */

const checks = (...items: string[]) => items.map((text) => ({ text }));

const hero = (eyebrow: string, title: string, subtitle: string) =>
  b("Hero", {
    variant: "minimal",
    eyebrow,
    title,
    subtitle,
    image: "",
    titleSize: "md",
    buttons: [
      { label: "Pedir demonstração", href: "#contato", style: "primary" },
      { label: "Conhecer o ParkFlow", href: "/", style: "link" },
    ],
    tone: "auto",
  });

const faq = (items: [string, string][]) =>
  b("Faq", {
    anchor: "perguntas",
    title: "Perguntas frequentes",
    items: items.map(([question, answer]) => ({ question, answer })),
    tone: "subtle",
  });

const otherSolutions = (current: string) =>
  b("Cards", {
    eyebrow: "Veja também",
    title: "Outras soluções do ParkFlow.",
    intro: "",
    columns: "3",
    cardStyle: "outline",
    items: [
      {
        title: "Mensalistas",
        text: "Entrada pela placa, contratos, vencimento e inadimplência sob controle.",
        href: "/mensalistas",
      },
      {
        title: "Convênios com lojas",
        text: "Desconto, minutos grátis ou conta paga pelo parceiro.",
        href: "/convenios",
      },
      {
        title: "Estacionamento sem cancela",
        text: "Saída vista pela câmera e pendência controlada.",
        href: "/sem-cancela",
      },
    ]
      .filter((c) => c.href !== current)
      .map((c) => ({ ...c, image: "", linkLabel: "Saiba mais" })),
    tone: "auto",
  });

function subPages(): Record<string, PageData> {
  return {
    "/mensalistas": {
      root: root(
        "Controle de mensalistas para estacionamento | ParkFlow",
        "Mensalista entra pela placa, sem cartão. Contratos com vencimento e carência, várias placas por cliente e controle de inadimplência no painel.",
        shot("patio")
      ),
      content: [
        navBar("/"),
        hero(
          "Mensalistas",
          "Mensalista entra\npela placa.",
          "Cadastre o cliente, as placas e o plano. A câmera reconhece o carro na entrada e o ParkFlow cuida das mensalidades, do vencimento e da inadimplência."
        ),
        b("Feature", {
          eyebrow: "Sem cartão e sem planilha",
          title: "A placa é a credencial.",
          text: "O mensalista é reconhecido pela placa cadastrada e aparece no pátio como mensalista, separado dos rotativos e dos convênios.\n\nPor padrão ele não recebe ticket de entrada. Se a unidade preferir, liga a impressão também para ele.",
          bullets: checks(
            "Um cliente com várias placas e limite de vagas, por exemplo duas placas e uma vaga",
            "Planos com valor e contratos com vencimento e carência",
            "O contrato novo já gera a primeira mensalidade",
            "Se a câmera errar um caractere e o operador corrigir a placa, o ticket passa a contar como mensalista"
          ),
          image: shot("patio"),
          reverse: false,
          buttons: [],
          tone: "auto",
        }),
        b("Feature", {
          eyebrow: "Inadimplência",
          title: "Quem está atrasado, sem procurar.",
          text: "As mensalidades vencidas aparecem no painel e o relatório de mensalistas mostra a situação de cada contrato, no computador ou no celular.",
          bullets: checks(
            "Mensalidades vencidas em destaque no painel",
            "Relatório de mensalistas por período, com exportação para planilha",
            "Cadastro com CPF ou CNPJ conferido e vários telefones e e-mails"
          ),
          image: shot("painel"),
          reverse: true,
          buttons: [],
          tone: "subtle",
        }),
        b("Text", {
          eyebrow: "Assistente de IA",
          title: "Cadastre pedindo em português.",
          body: "Diga ao assistente, por exemplo, para cadastrar um cliente com duas placas no plano mensal. Ele prepara o cadastro e o contrato e mostra o que vai mudar. Nada é gravado antes do seu clique em Aplicar.",
          size: "md",
          align: "center",
          buttons: [],
          tone: "auto",
        }),
        faq([
          [
            "O mensalista precisa de cartão ou controle?",
            "Não. A câmera lê a placa e o sistema reconhece o veículo cadastrado no contrato do cliente.",
          ],
          [
            "Um cliente pode ter mais de um carro?",
            "Sim. O cliente pode ter várias placas, e o contrato define quantas vagas ele usa ao mesmo tempo.",
          ],
          [
            "O mensalista recebe ticket na entrada?",
            "Por padrão, não. A unidade pode ligar a impressão do ticket também para mensalistas em Configurações.",
          ],
          [
            "Como sei quem está com a mensalidade atrasada?",
            "O painel mostra as mensalidades vencidas e o relatório de mensalistas traz a situação de cada contrato.",
          ],
          [
            "Funciona sem internet?",
            "Sim. O servidor da unidade reconhece o mensalista mesmo sem conexão e sincroniza com a nuvem quando ela volta.",
          ],
        ]),
        otherSolutions("/mensalistas"),
        demoForm(),
        footer(),
      ],
    },
    "/convenios": {
      root: root(
        "Convênio de estacionamento com lojas e clínicas | ParkFlow",
        "Desconto, minutos grátis ou isenção para clientes de lojas parceiras, pela placa ou na validação do ticket. O parceiro também pode pagar a conta.",
        shot("convenios")
      ),
      content: [
        navBar("/"),
        hero(
          "Convênios",
          "O cliente do parceiro\nsai sem discussão.",
          "Desconto, minutos grátis ou isenção total para quem vem da loja, da clínica ou do restaurante parceiro. O ParkFlow aplica a regra e calcula o valor na saída."
        ),
        b("Feature", {
          eyebrow: "Regras por parceiro",
          title: "Cada parceiro com a sua regra.",
          text: "Cadastre o convênio uma vez e escolha como ele é aplicado: automaticamente pela placa dos clientes cadastrados ou na validação do ticket.",
          bullets: checks(
            "Desconto em porcentagem ou em reais, minutos grátis ou isenção total",
            "Aplicação automática pela placa ou na validação do ticket",
            "Validação do ticket pelo próprio parceiro, no portal do parceiro",
            "O operador retira ou troca o convênio de um ticket aberto, quando precisa"
          ),
          image: shot("convenios"),
          reverse: false,
          buttons: [],
          tone: "auto",
        }),
        b("Feature", {
          eyebrow: "Conta do parceiro",
          title: "A loja paga. Você acompanha.",
          text: "No convênio “conta do parceiro”, o valor do cliente vai para a conta da loja e vira um valor a receber, fora do caixa do dia. Se o parceiro cobre só uma parte, o cliente paga o restante na forma que quiser.",
          bullets: checks(
            "Um botão para cada parceiro na tela de recebimento",
            "Baixa do que o parceiro pagou, ticket a ticket ou por período, com estorno do lote",
            "O relatório do dia mostra quanto cada convênio tem a receber"
          ),
          image: shot("resultado_saida"),
          reverse: true,
          buttons: [],
          tone: "subtle",
        }),
        faq([
          [
            "Quem paga o desconto, o estacionamento ou a loja?",
            "Os dois modelos existem. No convênio de desconto, o estacionamento concede o benefício. No convênio “conta do parceiro”, a loja paga o valor e o sistema controla o que ela deve.",
          ],
          [
            "Como o cliente da loja é reconhecido?",
            "Pela placa, quando o cliente está cadastrado no convênio, ou pela validação do ticket feita pelo parceiro ou pelo operador.",
          ],
          [
            "O valor do parceiro se mistura com o caixa?",
            "Não. O que o parceiro deve fica como valor a receber, separado do caixa e do faturamento, até ser dado baixa.",
          ],
          [
            "Posso ter vários parceiros?",
            "Sim. Cada convênio tem o seu tipo de benefício e a sua forma de aplicação.",
          ],
        ]),
        otherSolutions("/convenios"),
        demoForm(),
        footer(),
      ],
    },
    "/sem-cancela": {
      root: root(
        "Estacionamento sem cancela com leitura de placa | ParkFlow",
        "Sem cancela, a câmera da saída vê o carro, o valor fica registrado na hora e quem sai sem pagar vira uma pendência que o sistema avisa na volta.",
        shot("patio")
      ),
      content: [
        navBar("/"),
        hero(
          "Estacionamento sem cancela",
          "Sem cancela.\nSem prejuízo.",
          "Nem todo estacionamento tem cancela. O ParkFlow registra a entrada e a saída pela câmera e transforma o carro que saiu sem pagar em uma pendência controlada."
        ),
        b("Feature", {
          eyebrow: "Visto na saída",
          title: "O carro saiu? O sistema viu.",
          text: "Quando a câmera da saída lê a placa de um carro com valor a pagar, o pátio marca “Visto na saída”, com a hora. O operador confirma “Saiu sem pagar” e o ticket vira pendência, com o valor daquela hora.",
          bullets: checks(
            "A saída de veículos nunca é bloqueada pelo sistema",
            "A pendência é paga depois ou perdoada pelo gerente, com o motivo registrado",
            "Quando a placa volta, o sistema avisa o operador da pendência",
            "Foto da entrada e da saída como prova de cada passagem"
          ),
          image: shot("patio"),
          reverse: false,
          buttons: [],
          tone: "auto",
        }),
        b("Feature", {
          eyebrow: "Leitura conferida",
          title: "Placa lida com um caractere errado.",
          text: "Se a câmera da saída errar um caractere e existir um único ticket aberto parecido, o sistema usa esse ticket e marca para conferência. A marca, o modelo e a cor identificados por IA na entrada ajudam a confirmar que é o mesmo carro.",
          bullets: checks(
            "Leituras duvidosas vão para conferência do operador",
            "A placa pode ser corrigida em um clique",
            "Com dois tickets parecidos, nada é casado sozinho"
          ),
          image: shot("resultado_entrada"),
          reverse: true,
          buttons: [],
          tone: "subtle",
        }),
        faq([
          [
            "O que acontece se o cliente sair sem pagar?",
            "O operador confirma a saída sem pagamento e o ticket vira pendência, com a hora em que a câmera viu o carro e o valor daquele momento. Ela pode ser paga depois ou perdoada pelo gerente.",
          ],
          [
            "A pendência é cobrada na próxima visita?",
            "Quando a placa volta, o sistema avisa o operador. A pendência não é somada sozinha ao ticket novo: o operador cobra à parte.",
          ],
          [
            "Preciso de câmera na saída?",
            "Para o sistema ver a saída sozinho, sim. Sem câmera na saída, o operador registra a saída na tela.",
          ],
          [
            "Dá para instalar uma cancela depois?",
            "Sim. Com cancela, o ParkFlow pode acioná-la por um relé de rede.",
          ],
        ]),
        otherSolutions("/sem-cancela"),
        demoForm(),
        footer(),
      ],
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
