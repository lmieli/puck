import type Database from "better-sqlite3";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { PageData } from "../ai/page-ops.ts";
import { buildTemplate, type TemplateId } from "./templates.ts";
import {
  PARKFLOW_NAME,
  PARKFLOW_SLUG,
  parkflowPages,
  parkflowSeo,
} from "./parkflow.ts";

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

// Versões do conteúdo do site do ParkFlow já aplicadas a um banco (tabela
// seeded_sites). "parkflow" = site criado; "parkflow:v2" = título novo e as
// páginas Mensalistas, Convênios e Sem cancela.
const PARKFLOW_V2 = `${PARKFLOW_SLUG}:v2`;

/**
 * Cria o site de venda do ParkFlow uma única vez por banco, inclusive em bancos
 * que já existiam antes dele, e depois aplica as atualizações do conteúdo
 * (`upgradeParkflowSite`). Se a agência apagar o site, ele não volta (a marca
 * fica em seeded_sites). Se já houver outro site com o mesmo endereço, nada é
 * criado nem alterado.
 */
export function ensureParkflowSite(conn: Database.Database) {
  conn.exec(
    "CREATE TABLE IF NOT EXISTS seeded_sites (slug TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );
  const marked = (slug: string) =>
    !!conn.prepare("SELECT 1 FROM seeded_sites WHERE slug = ?").get(slug);
  const owner = conn
    .prepare(
      "SELECT id FROM users WHERE is_super_admin = 1 ORDER BY created_at LIMIT 1"
    )
    .get() as { id: string } | undefined;
  if (!owner) return null;
  if (marked(PARKFLOW_SLUG)) {
    if (!marked(PARKFLOW_V2)) upgradeParkflowSite(conn, owner.id);
    return null;
  }
  return conn.transaction(() => {
    const mark = conn.prepare("INSERT INTO seeded_sites (slug) VALUES (?)");
    mark.run(PARKFLOW_SLUG);
    mark.run(PARKFLOW_V2);
    const taken = conn
      .prepare("SELECT 1 FROM sites WHERE slug = ?")
      .get(PARKFLOW_SLUG);
    if (taken) return null;
    const id = insertSite(conn, {
      slug: PARKFLOW_SLUG,
      name: PARKFLOW_NAME,
      template: "blank",
      pages: parkflowPages(),
      authorId: owner.id,
    });
    conn
      .prepare("UPDATE sites SET seo = ? WHERE id = ?")
      .run(JSON.stringify(parkflowSeo()), id);
    conn
      .prepare(
        "INSERT INTO activity (site_id, user_id, kind, detail) VALUES (?, ?, 'site', ?)"
      )
      .run(id, owner.id, "Site de venda do ParkFlow criado e publicado");
    return id;
  })();
}

/**
 * Site criado na 1ª versão: acrescenta as páginas novas que ainda não existem
 * (publicadas) e troca a página inicial pela nova (título para o Google e links
 * das páginas) SÓ se ela continua exatamente como foi criada: página editada
 * ou republicada pela agência não é tocada. A troca vira a versão 2 da página,
 * e a versão 1 continua no histórico para restaurar.
 */
export function upgradeParkflowSite(conn: Database.Database, ownerId: string) {
  conn.transaction(() => {
    conn.prepare("INSERT INTO seeded_sites (slug) VALUES (?)").run(PARKFLOW_V2);
    const site = conn
      .prepare("SELECT id FROM sites WHERE slug = ?")
      .get(PARKFLOW_SLUG) as { id: string } | undefined;
    if (!site) return;
    const pages = parkflowPages();
    const changed: string[] = [];
    for (const [path, data] of Object.entries(pages)) {
      const json = JSON.stringify(data);
      const row = conn
        .prepare(
          "SELECT draft, published, published_version FROM pages WHERE site_id = ? AND path = ?"
        )
        .get(site.id, path) as
        | { draft: string; published: string | null; published_version: number }
        | undefined;
      if (!row) {
        conn
          .prepare(
            "INSERT INTO pages (site_id, path, draft, published, published_version, updated_by) VALUES (?, ?, ?, ?, 1, ?)"
          )
          .run(site.id, path, json, json, ownerId);
        conn
          .prepare(
            "INSERT INTO versions (site_id, path, number, data, note, source, author_id) VALUES (?, ?, 1, ?, ?, 'template', ?)"
          )
          .run(site.id, path, json, "Criado a partir do modelo", ownerId);
        changed.push(path);
        continue;
      }
      if (path !== "/") continue;
      const versions = conn
        .prepare(
          "SELECT number, source, data FROM versions WHERE site_id = ? AND path = ?"
        )
        .all(site.id, path) as {
        number: number;
        source: string;
        data: string;
      }[];
      const untouched =
        row.published_version === 1 &&
        row.draft === row.published &&
        versions.length === 1 &&
        versions[0].source === "template" &&
        versions[0].data === row.published;
      if (!untouched) continue;
      conn
        .prepare(
          "UPDATE pages SET draft = ?, published = ?, published_version = 2, updated_by = ?, updated_at = datetime('now') WHERE site_id = ? AND path = ?"
        )
        .run(json, json, ownerId, site.id, path);
      conn
        .prepare(
          "INSERT INTO versions (site_id, path, number, data, note, source, author_id) VALUES (?, ?, 2, ?, ?, 'template', ?)"
        )
        .run(
          site.id,
          path,
          json,
          "Título para o Google e links das novas páginas",
          ownerId
        );
      changed.push(path);
    }
    if (changed.length)
      conn
        .prepare(
          "INSERT INTO activity (site_id, user_id, kind, detail) VALUES (?, ?, 'site', ?)"
        )
        .run(
          site.id,
          ownerId,
          `Site do ParkFlow atualizado: ${changed.join(", ")}`
        );
  })();
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
