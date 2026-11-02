import type Database from "better-sqlite3";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { PageData } from "../ai/page-ops.ts";
import { buildTemplate, type TemplateId } from "./templates.ts";

function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/** Insert a site and its pages, publishing each page as version 1. */
export function insertSite(
  conn: Database.Database,
  opts: {
    slug: string;
    name: string;
    template: TemplateId;
    pages: Record<string, PageData>;
    authorId: string | null;
  }
) {
  const id = randomUUID();
  conn
    .prepare("INSERT INTO sites (id, slug, name, template) VALUES (?, ?, ?, ?)")
    .run(id, opts.slug, opts.name, opts.template);
  for (const [path, data] of Object.entries(opts.pages)) {
    const json = JSON.stringify(data);
    conn
      .prepare(
        "INSERT INTO pages (site_id, path, draft, published, published_version, updated_by) VALUES (?, ?, ?, ?, 1, ?)"
      )
      .run(id, path, json, json, opts.authorId);
    conn
      .prepare(
        "INSERT INTO versions (site_id, path, number, data, note, source, author_id) VALUES (?, ?, 1, ?, ?, 'template', ?)"
      )
      .run(id, path, json, "Criado a partir do modelo", opts.authorId);
  }
  const free = Number(process.env.VITRINE_FREE_CREDITS ?? 1000);
  if (free > 0) {
    conn.prepare("UPDATE sites SET credits = ? WHERE id = ?").run(free, id);
    conn
      .prepare(
        "INSERT INTO credit_ledger (site_id, kind, amount, balance_after, note) VALUES (?, 'grant', ?, ?, 'Créditos de boas-vindas')"
      )
      .run(id, free, free);
  }
  return id;
}

function insertUser(
  conn: Database.Database,
  email: string,
  name: string,
  password: string,
  superAdmin = false
) {
  const id = randomUUID();
  conn
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, is_super_admin) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, email, name, hash(password), superAdmin ? 1 : 0);
  return id;
}

const G = (path: string) =>
  `https://geminiengenharia.com.br/wp-content/uploads/${path}`;

/** The Gemini demo uses the company's real content and photos. */
function geminiPages() {
  const pages = buildTemplate("construtora", "Gemini Engenharia");
  const home = pages["/"];
  const set = (type: string, props: Record<string, unknown>) => {
    const block = home.content.find((b) => b.type === type);
    if (block) Object.assign(block.props, props);
  };
  home.root.props = {
    ...home.root.props,
    title: "Gemini Engenharia — construindo em Nova Friburgo desde 1972",
  };
  set("Hero", {
    eyebrow: "Residencial Bougainville · Villa das Flores",
    title: "Agora só\nfalta você.",
    subtitle:
      "Os últimos apartamentos de 3 quartos e coberturas duplex do Residencial Bougainville esperam pela sua família.",
    image: G("2026/07/banner03.jpg"),
  });
  set("Stats", {
    items: [
      { value: "1972", label: "construindo em Nova Friburgo" },
      { value: "435+", label: "obras realizadas" },
      { value: "ISO 9001", label: "e PBQP-H" },
    ],
  });
  set("StickyStory", {
    eyebrow: "Empreendimentos",
    title: "Escolha onde começar.",
    chapters: [
      {
        eyebrow: "Últimas unidades",
        title: "Residencial Bougainville",
        text: "Apartamentos de 3 quartos e coberturas duplex, duas vagas, dois elevadores e varanda em todas as unidades.",
        image: G("2025/01/Sala-ampliada.jpg"),
      },
      {
        eyebrow: "Pronto para morar",
        title: "Residencial Gardênia",
        text: "2 quartos com suíte e coberturas duplex de 3 quartos, com elevador, garagem coberta e salão de festas.",
        image: G(
          "2022/12/gemini-engenharia-villa-das-flores-residencial-gardenia-imoveis-nova-friburgo.jpg"
        ),
      },
      {
        eyebrow: "Comercial",
        title: "Villa Boulevard",
        text: "12 lojas com pé-direito duplo e 59 salas comerciais na Via Expressa, em Olaria.",
        image: G("2025/02/boulevard.jpg"),
      },
    ],
  });
  set("Parallax", {
    image: G("2020/03/vila-image-home.jpg"),
    title: "Villa das Flores:\nmorar, trabalhar e investir.",
  });
  set("Feature", {
    title: "Realizando sonhos desde 1972.",
    text: "A Gemini Engenharia atua em Nova Friburgo e região desde 1972, com projetos residenciais e comerciais.\n\nA entrega de um empreendimento é a nossa maior motivação para novas realizações.",
    bullets: [
      { text: "Certificação ISO 9001 e PBQP-H" },
      { text: "Negociação direta com a construtora" },
      { text: "Andamento da obra publicado no site" },
    ],
    image: G("2020/04/gemini-engenharia-sobre-nos.jpg"),
  });
  set("Gallery", {
    images: [
      { src: G("2025/01/Cozinha.jpg"), caption: "Cozinha" },
      { src: G("2025/01/Quarto.jpg"), caption: "Quarto" },
      { src: G("2025/01/Home-ofice.jpg"), caption: "Home office" },
    ],
  });
  for (const page of Object.values(pages)) {
    for (const b of page.content) {
      if (b.type === "Contact")
        Object.assign(b.props, {
          email: "comercial@geminiengenharia.com.br",
          phone: "(22) 2522-1329",
          address:
            "Rua Maria Duque Estrada Laginestra, 900b\nParque São Clemente, Nova Friburgo – RJ",
        });
    }
  }
  return pages;
}

export function seed(conn: Database.Database) {
  const count = conn.prepare("SELECT COUNT(*) AS n FROM users").get() as {
    n: number;
  };
  if (count.n > 0) return;

  const password = process.env.VITRINE_DEMO_PASSWORD || "vitrine123";
  const owner = insertUser(
    conn,
    process.env.VITRINE_ADMIN_EMAIL || "admin@vitrine.app",
    "Equipe Vitrine",
    password,
    true
  );
  const clientAdmin = insertUser(
    conn,
    "cliente@gemini.com.br",
    "Ana (Gemini)",
    password
  );
  const clientEditor = insertUser(
    conn,
    "editor@gemini.com.br",
    "Bruno (Gemini)",
    password
  );

  insertSite(conn, {
    slug: "aurora",
    name: "Aurora One",
    template: "produto",
    pages: buildTemplate("produto", "Aurora One"),
    authorId: owner,
  });
  const gemini = insertSite(conn, {
    slug: "gemini",
    name: "Gemini Engenharia",
    template: "construtora",
    pages: geminiPages(),
    authorId: owner,
  });
  conn
    .prepare(
      "INSERT INTO memberships (user_id, site_id, role) VALUES (?, ?, 'admin')"
    )
    .run(clientAdmin, gemini);
  conn
    .prepare(
      "INSERT INTO memberships (user_id, site_id, role) VALUES (?, ?, 'editor')"
    )
    .run(clientEditor, gemini);
}
