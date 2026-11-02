import "server-only";
import { randomUUID } from "node:crypto";
import { HttpError, type User } from "./auth";
import { db } from "./db";
import { secretKey } from "./leads";
import { log, siteFor } from "./repo";
import { decrypt, encrypt } from "./secrets";
import { readForm, type LeadRow } from "./signup";
import {
  explainNotionError,
  isTokenShape,
  MAX_NOTION,
  parseDatabaseId,
  parseScope,
  readDatabase,
  reconcileMapping,
  scopeValue,
  suggestMapping,
  validSource,
  type FormScope,
  type Mapping,
  type NotionColumn,
} from "./notion";
import {
  createLeadPage,
  notionCall,
  readNotionConfig,
  trashPage,
  type NotionConfig,
} from "./notion-send";

/* ------------------------------------------------------------------ */
/* Forms of the site                                                    */
/* ------------------------------------------------------------------ */

export type SiteForm = {
  /** Value of the "which form" select: all | classic | the form name. */
  value: string;
  name: string;
  /** Question labels, for the "answer" sources. */
  answers: string[];
};

const CLASSIC_ANSWERS = ["Nome", "E-mail", "Telefone", "Mensagem"];

/** Forms the site has (drafts included, so a client can connect before publishing) and forms that already have leads. */
export function siteForms(siteId: string): SiteForm[] {
  const out = new Map<string, SiteForm>();
  const add = (name: string, answers: string[]) => {
    const prev = out.get(name);
    if (!prev) out.set(name, { value: scopeValue(name), name, answers });
    else
      for (const a of answers)
        if (!prev.answers.includes(a)) prev.answers.push(a);
  };
  const rows = db()
    .prepare("SELECT draft, published FROM pages WHERE site_id = ?")
    .all(siteId) as { draft: string; published: string | null }[];
  for (const r of rows)
    for (const raw of [r.published, r.draft]) {
      if (!raw) continue;
      try {
        const page = JSON.parse(raw) as {
          content: { type: string; props: Record<string, unknown> }[];
        };
        for (const b of page.content)
          if (b.type === "Signup") {
            const f = readForm(b.props);
            add(
              f.name,
              f.fields.map((x) => x.label)
            );
          }
      } catch {
        // unreadable page: skip
      }
    }
  const classic = db()
    .prepare("SELECT 1 FROM leads WHERE site_id = ? AND form = '' LIMIT 1")
    .get(siteId);
  if (classic) add("", CLASSIC_ANSWERS);
  const known = db()
    .prepare("SELECT DISTINCT form FROM leads WHERE site_id = ?")
    .all(siteId) as { form: string }[];
  for (const k of known) if (!out.has(k.form)) add(k.form, []);
  return [...out.values()];
}

/** Question labels a connection can use: its form's, or every form's when it serves all. */
export function answersFor(forms: SiteForm[], scope: FormScope): string[] {
  const list = scope === null ? forms : forms.filter((f) => f.name === scope);
  return [...new Set(list.flatMap((f) => f.answers))];
}

/* ------------------------------------------------------------------ */
/* Connections                                                          */
/* ------------------------------------------------------------------ */

export type NotionView = {
  id: string;
  name: string;
  enabled: boolean;
  dbTitle: string;
  databaseId: string;
  tokenHint: string;
  scope: FormScope;
  mapping: Mapping;
  columns: NotionColumn[];
  created_at: string;
};

export function listNotion(siteId: string): NotionView[] {
  const rows = db()
    .prepare(
      "SELECT * FROM integrations WHERE site_id = ? AND kind = 'notion' ORDER BY created_at, id"
    )
    .all(siteId) as {
    id: string;
    name: string;
    enabled: number;
    config: string;
    created_at: string;
  }[];
  const out: NotionView[] = [];
  for (const r of rows) {
    try {
      const c = readNotionConfig(r.config);
      out.push({
        id: r.id,
        name: r.name,
        enabled: !!r.enabled,
        dbTitle: c.dbTitle,
        databaseId: c.databaseId,
        tokenHint: c.hint,
        scope: c.form ?? null,
        mapping: c.mapping,
        columns: c.columns as NotionColumn[],
        created_at: r.created_at,
      });
    } catch {
      // a damaged row is left out; it can still be removed from the deliveries list
    }
  }
  return out;
}

const cleanName = (s: string) =>
  s
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 60);

/** Read the database with the client's token, in words the client can act on. */
async function loadDatabase(token: string, databaseId: string) {
  let r;
  try {
    r = await notionCall(token, "GET", `/v1/databases/${databaseId}`);
  } catch {
    throw new HttpError(
      502,
      "Não foi possível falar com o Notion agora. Tente de novo."
    );
  }
  if (r.status !== 200) {
    const e = explainNotionError(r.status, r.body);
    throw new HttpError(400, e.message);
  }
  return readDatabase(r.json);
}

function getConnection(siteId: string, id: string) {
  const row = db()
    .prepare(
      "SELECT * FROM integrations WHERE id = ? AND site_id = ? AND kind = 'notion'"
    )
    .get(id, siteId) as
    | { id: string; name: string; enabled: number; config: string }
    | undefined;
  if (!row) throw new HttpError(404, "Conexão com o Notion não encontrada.");
  return { row, config: readNotionConfig(row.config) };
}

/** Connect a database. The token is checked against Notion and stored sealed. */
export async function connectNotion(
  user: User,
  slug: string,
  input: { name: string; token: string; database: string; scope: string }
) {
  const { site } = siteFor(user, slug, "admin");
  const token = input.token.trim();
  if (!isTokenShape(token))
    throw new HttpError(
      400,
      'O token deve começar com "ntn_" ou "secret_". Copie-o em notion.so/my-integrations, na sua integração.'
    );
  const databaseId = parseDatabaseId(input.database);
  if (!databaseId)
    throw new HttpError(
      400,
      "Cole o link do banco de dados do Notion (a página do banco, não de um item dentro dele)."
    );
  const count = (
    db()
      .prepare(
        "SELECT COUNT(*) AS n FROM integrations WHERE site_id = ? AND kind = 'notion'"
      )
      .get(site.id) as { n: number }
  ).n;
  if (count >= MAX_NOTION)
    throw new HttpError(
      400,
      `No máximo ${MAX_NOTION} conexões com o Notion por site.`
    );

  const scope = parseScope(input.scope);
  const db_ = await loadDatabase(token, databaseId);
  if (!db_.columns.some((c) => c.type === "title"))
    throw new HttpError(400, "Esse banco não tem coluna de título.");
  const name = cleanName(input.name) || db_.title;
  const config: NotionConfig = {
    token: encrypt(token, secretKey()),
    hint: token.slice(-4),
    databaseId,
    dbTitle: db_.title,
    form: scope,
    columns: db_.columns,
    mapping: suggestMapping(db_.columns, answersFor(siteForms(site.id), scope)),
  };
  const id = randomUUID();
  db()
    .prepare(
      "INSERT INTO integrations (id, site_id, kind, name, config) VALUES (?, ?, 'notion', ?, ?)"
    )
    .run(id, site.id, name, JSON.stringify(config));
  log(
    site.id,
    user.id,
    "cadastros",
    `Notion conectado: "${name}" (${db_.title}).`
  );
  return id;
}

/** Save what the client edited: name, which form, on/off, and each column's source. */
export function saveNotion(
  user: User,
  slug: string,
  id: string,
  form: FormData
) {
  const { site } = siteFor(user, slug, "admin");
  const { row, config } = getConnection(site.id, id);
  const scope = parseScope(String(form.get("scope") ?? "all"));
  const mapping: Mapping = [];
  for (const c of config.columns) {
    const source = String(form.get(`map:${c.id}`) ?? "");
    if (!validSource(source, true))
      throw new HttpError(400, `Origem inválida para a coluna "${c.name}".`);
    mapping.push({
      property: c.name,
      type: c.type as Mapping[number]["type"],
      source,
    });
  }
  // An answer chosen earlier stays valid even if the form no longer lists it.
  const next: NotionConfig = { ...config, form: scope, mapping };
  const name = cleanName(String(form.get("name") ?? "")) || row.name;
  db()
    .prepare(
      "UPDATE integrations SET name = ?, config = ?, enabled = ? WHERE id = ?"
    )
    .run(name, JSON.stringify(next), form.get("enabled") === "on" ? 1 : 0, id);
  log(
    site.id,
    user.id,
    "cadastros",
    `Conexão com o Notion "${name}" alterada.`
  );
  const titleCol = mapping.find((m) => m.type === "title");
  return titleCol && !titleCol.source
    ? "Salvo. A coluna de título está sem origem: usaremos o nome (ou o e-mail) do contato."
    : "Salvo. Vale para os próximos cadastros.";
}

/** Read the columns again (the client added, renamed or removed some in Notion). */
export async function refreshNotion(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  const { config } = getConnection(site.id, id);
  const token = decrypt(config.token, secretKey());
  const fresh = await loadDatabase(token, config.databaseId);
  const next: NotionConfig = {
    ...config,
    dbTitle: fresh.title,
    columns: fresh.columns,
    mapping: reconcileMapping(
      fresh.columns,
      config.mapping,
      config.columns as NotionColumn[]
    ),
  };
  db()
    .prepare("UPDATE integrations SET config = ? WHERE id = ?")
    .run(JSON.stringify(next), id);
  const added = fresh.columns.filter(
    (c) => !config.columns.some((o) => o.id === c.id)
  ).length;
  return `Colunas atualizadas (${fresh.columns.length}${
    added ? `, ${added} nova${added > 1 ? "s" : ""}` : ""
  }).`;
}

/** Create a made-up lead in the database, then move it to the trash. */
export async function testNotion(user: User, slug: string, id: string) {
  const { site } = siteFor(user, slug, "admin");
  const { config } = getConnection(site.id, id);
  const forms = siteForms(site.id);
  const labels = answersFor(forms, config.form ?? null);
  const lead: LeadRow = {
    id: "teste-" + randomUUID().slice(0, 8),
    page: "/",
    name: "Maria Teste",
    email: "maria.teste@exemplo.com",
    phone: "(11) 91234-5678",
    message: "Envio de teste da Vitrine. Pode apagar.",
    origin: JSON.stringify({ utm_source: "teste" }),
    form: config.form ?? "Teste",
    data: JSON.stringify({
      answers: [
        { key: "f0", label: "Nome", kind: "name", value: "Maria Teste" },
        {
          key: "f1",
          label: "E-mail",
          kind: "email",
          value: "maria.teste@exemplo.com",
        },
        {
          key: "f2",
          label: "Telefone",
          kind: "phone",
          value: "(11) 91234-5678",
        },
        ...labels
          .filter((l) => !["Nome", "E-mail", "Telefone"].includes(l))
          .map((label, i) => ({
            key: `t${i}`,
            label,
            kind: "text",
            value: "Exemplo",
          })),
      ],
      consentText: "",
    }),
    consent: 1,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  };
  try {
    const pageId = await createLeadPage({ config, lead, key: secretKey() });
    if (pageId) {
      try {
        await trashPage(decrypt(config.token, secretKey()), pageId);
      } catch {
        // the page was created; cleaning up is best effort
      }
    }
    return {
      ok: true,
      message:
        "Deu certo: criamos uma linha de teste no banco e a movemos para a lixeira do Notion.",
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
