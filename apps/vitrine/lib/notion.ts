// Notion destination for leads. Each client connects its own Notion database
// (its own integration token), per form if it wants, and chooses which answer
// goes into which column. Pure module (no database, no network): everything
// that decides what is sent, and how errors are read, is unit-tested.

import { answersOf, formLabel, originOf, type LeadRow } from "./signup.ts";
import { sourceLabel } from "./tracking.ts";

export const NOTION_VERSION = "2022-06-28";
export const MAX_NOTION = 10;

/** Column types a lead value can be written into. Formula, relation, people, files… are not offered. */
export const WRITABLE = [
  "title",
  "rich_text",
  "email",
  "phone_number",
  "url",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "checkbox",
] as const;
export type PropType = (typeof WRITABLE)[number];

export const TYPE_LABEL: Record<PropType, string> = {
  title: "título",
  rich_text: "texto",
  email: "e-mail",
  phone_number: "telefone",
  url: "link",
  number: "número",
  select: "seleção",
  multi_select: "várias seleções",
  status: "status",
  date: "data",
  checkbox: "caixa de marcar",
};

export type NotionColumn = { id: string; name: string; type: PropType };

/** One column of the database and where its value comes from. */
export type Mapping = {
  /** Column name in Notion (what the API takes). */
  property: string;
  type: PropType;
  /** A fixed source id (see FIXED_SOURCES) or "answer:<question label>". */
  source: string;
}[];

export const FIXED_SOURCES: { id: string; label: string }[] = [
  { id: "name", label: "Nome" },
  { id: "email", label: "E-mail" },
  { id: "phone", label: "Telefone" },
  { id: "message", label: "Mensagem" },
  { id: "form", label: "Nome do formulário" },
  { id: "page", label: "Página do site" },
  { id: "created", label: "Data e hora do envio" },
  { id: "source", label: "Origem (Google, Instagram, direto…)" },
  { id: "consent", label: "Consentimento dado (sim/não)" },
  { id: "id", label: "Código do cadastro" },
];

export const ANSWER_PREFIX = "answer:";
export const answerSource = (label: string) => `${ANSWER_PREFIX}${label}`;

/* ------------------------------------------------------------------ */
/* The database                                                         */
/* ------------------------------------------------------------------ */

const HEX32 = /[0-9a-f]{32}/i;

/** Id of a database from what people paste: the page link, or the id itself. */
export function parseDatabaseId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let candidate = raw;
  try {
    const u = new URL(raw);
    if (!/(^|\.)notion\.(so|site)$/i.test(u.hostname)) return null;
    // The id is the last 32 hex digits of the path. The "?v=" in the query is a
    // view, not the database.
    candidate = u.pathname.replace(/-/g, "");
  } catch {
    candidate = raw.replace(/-/g, "");
  }
  const all = candidate.match(/[0-9a-f]{32}/gi);
  if (!all) return null;
  const id = all[all.length - 1].toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(
    16,
    20
  )}-${id.slice(20)}`;
}

export const isTokenShape = (t: string) =>
  /^(secret_|ntn_)[A-Za-z0-9]{20,}$/.test(t.trim());

/** Title and writable columns of a database, from the API answer. */
export function readDatabase(json: unknown): {
  title: string;
  columns: NotionColumn[];
} {
  const j = (json ?? {}) as {
    title?: { plain_text?: string }[];
    properties?: Record<string, { id?: string; name?: string; type?: string }>;
  };
  const title = (j.title ?? [])
    .map((t) => t.plain_text ?? "")
    .join("")
    .trim();
  const columns: NotionColumn[] = [];
  for (const [key, p] of Object.entries(j.properties ?? {})) {
    if (!p || !(WRITABLE as readonly string[]).includes(String(p.type)))
      continue;
    columns.push({
      id: String(p.id ?? key),
      name: String(p.name ?? key),
      type: p.type as PropType,
    });
  }
  // Title first (every database has exactly one), then the order Notion gives.
  columns.sort(
    (a, b) => Number(b.type === "title") - Number(a.type === "title")
  );
  return { title: title || "Banco sem nome", columns };
}

/* ------------------------------------------------------------------ */
/* Mapping                                                              */
/* ------------------------------------------------------------------ */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const NAME_HINTS: Record<string, string[]> = {
  name: ["nome", "name", "cliente", "contato", "lead"],
  email: ["email", "e mail", "correio"],
  phone: ["telefone", "phone", "celular", "whatsapp", "fone"],
  message: [
    "mensagem",
    "message",
    "observacao",
    "observacoes",
    "obs",
    "comentario",
    "detalhes",
  ],
  form: ["formulario", "form"],
  page: ["pagina", "page"],
  created: ["data", "date", "criado", "enviado", "recebido"],
  source: ["origem", "source", "canal", "fonte"],
  consent: ["consentimento", "lgpd", "consent"],
  id: ["codigo", "id"],
};

/**
 * A first guess the client then edits: the title gets the name (or e-mail),
 * columns whose name matches a source get that source, and typed columns
 * (e-mail, phone) get the matching contact field.
 */
export function suggestMapping(
  columns: NotionColumn[],
  answerLabels: string[] = []
): Mapping {
  const used = new Set<string>();
  const take = (src: string) => {
    if (used.has(src)) return null;
    used.add(src);
    return src;
  };
  return columns.map((c) => {
    const n = norm(c.name);
    let source = "";
    const fixed = (exact: boolean) => {
      for (const [id, hints] of Object.entries(NAME_HINTS))
        if (
          hints.some((h) => (exact ? n === h : h.length > 3 && n.includes(h)))
        ) {
          const t = take(id);
          if (t) return t;
        }
      return "";
    };
    // 1. The column is named like a standard field (Nome, E-mail, Telefone…).
    if (c.type !== "title" || n === "nome" || n === "name")
      source = fixed(true);
    // 2. A question with the same name as the column.
    if (!source && c.type !== "title") {
      const q = answerLabels.find((l) => norm(l) === n);
      if (q) source = take(answerSource(q)) ?? "";
    }
    // 3. A column whose name contains a standard field's name.
    if (!source && c.type !== "title") source = fixed(false);
    // 4. By type.
    if (!source && c.type === "title")
      source = take("name") ?? take("email") ?? "";
    if (!source && c.type === "email") source = take("email") ?? "";
    if (!source && c.type === "phone_number") source = take("phone") ?? "";
    return { property: c.name, type: c.type, source };
  });
}

/** Keep the client's choices when columns are re-read: match by name, add new columns empty. */
export function reconcileMapping(
  columns: NotionColumn[],
  old: Mapping,
  oldColumns: NotionColumn[] = []
): Mapping {
  return columns.map((c) => {
    const byId = oldColumns.find((o) => o.id === c.id);
    const prev =
      old.find((m) => m.property === (byId?.name ?? c.name)) ??
      old.find((m) => m.property === c.name);
    return { property: c.name, type: c.type, source: prev?.source ?? "" };
  });
}

/** Sources a form offers: the fixed ones plus its own questions. */
export function sourcesFor(answerLabels: string[]) {
  return [
    ...FIXED_SOURCES,
    ...answerLabels.map((l) => ({
      id: answerSource(l),
      label: `Resposta: ${l}`,
    })),
  ];
}

export function validSource(source: string, answerLabelsKnown: boolean) {
  if (source === "") return true;
  if (FIXED_SOURCES.some((s) => s.id === source)) return true;
  return (
    answerLabelsKnown &&
    source.startsWith(ANSWER_PREFIX) &&
    source.length > ANSWER_PREFIX.length
  );
}

/* ------------------------------------------------------------------ */
/* Values                                                               */
/* ------------------------------------------------------------------ */

const MAX_TEXT = 2000;
const cut = (s: string) =>
  s.length > MAX_TEXT ? s.slice(0, MAX_TEXT - 1) + "…" : s;

/** The text of one source for a lead ("" when the person left it blank). */
export function sourceValue(lead: LeadRow, source: string): string {
  switch (source) {
    case "name":
      return lead.name;
    case "email":
      return lead.email;
    case "phone":
      return lead.phone;
    case "message":
      return lead.message;
    case "form":
      return formLabel(lead.form);
    case "page":
      return lead.page;
    case "created":
      return lead.created_at;
    case "source":
      return sourceLabel(originOf(lead));
    case "consent":
      return lead.consent ? "sim" : "não";
    case "id":
      return lead.id;
  }
  if (source.startsWith(ANSWER_PREFIX)) {
    const want = norm(source.slice(ANSWER_PREFIX.length));
    return answersOf(lead).find((a) => norm(a.label) === want)?.value ?? "";
  }
  return "";
}

const YES = /^(sim|s|yes|y|true|1|ok|x)$/i;

/** The Notion property value for a type, or null to leave the column empty. */
export function convertValue(
  type: PropType,
  raw: string
): Record<string, unknown> | null {
  const v = raw.trim();
  switch (type) {
    case "title":
      return v ? { title: [{ text: { content: cut(v) } }] } : null;
    case "rich_text":
      return v ? { rich_text: [{ text: { content: cut(v) } }] } : null;
    case "email":
      return v ? { email: v } : null;
    case "phone_number":
      return v ? { phone_number: v } : null;
    case "url":
      return /^https?:\/\//i.test(v) ? { url: v } : null;
    case "number": {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      return v && Number.isFinite(n) ? { number: n } : null;
    }
    case "select":
      return v
        ? { select: { name: v.replace(/,/g, " ").slice(0, 100) } }
        : null;
    case "multi_select": {
      const names = v
        .split(/[,;\n]/)
        .map((s) => s.trim().slice(0, 100))
        .filter(Boolean);
      return names.length
        ? { multi_select: names.map((name) => ({ name })) }
        : null;
    }
    case "status":
      return v ? { status: { name: v.slice(0, 100) } } : null;
    case "date": {
      const m = v.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
      if (m) return { date: { start: `${m[1]}T${m[2]}Z` } };
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? { date: { start: v } } : null;
    }
    case "checkbox":
      return { checkbox: YES.test(v) };
  }
}

/** The body of "create page". The title is never left empty: Notion rejects it and the lead would be lost. */
export function buildPage(
  databaseId: string,
  mapping: Mapping,
  lead: LeadRow
): { parent: { database_id: string }; properties: Record<string, unknown> } {
  const properties: Record<string, unknown> = {};
  let titleName = "";
  for (const m of mapping) {
    if (m.type === "title") titleName = m.property;
    if (!m.source) continue;
    const value = convertValue(m.type, sourceValue(lead, m.source));
    if (value) properties[m.property] = value;
  }
  if (titleName && !properties[titleName]) {
    const fallback =
      lead.name || lead.email || lead.phone || `Cadastro de ${lead.created_at}`;
    properties[titleName] = convertValue("title", fallback);
  }
  return { parent: { database_id: databaseId }, properties };
}

/* ------------------------------------------------------------------ */
/* Which form a connection serves                                       */
/* ------------------------------------------------------------------ */

/**
 * null = every form. Otherwise the exact form name; "" is the classic contact
 * form (older leads and the plain contact block keep an empty form name).
 */
export type FormScope = string | null;

export const matchesForm = (scope: FormScope | undefined, leadForm: string) =>
  scope === undefined || scope === null || scope === leadForm;

/** The select in the panel sends "all", "classic" or the form name. */
export function parseScope(value: string): FormScope {
  if (value === "all" || value === "") return null;
  if (value === "classic") return "";
  return value.slice(0, 120);
}

export const scopeValue = (scope: FormScope) =>
  scope === null ? "all" : scope === "" ? "classic" : scope;

/* ------------------------------------------------------------------ */
/* Errors                                                               */
/* ------------------------------------------------------------------ */

/** What the API answered, in words the client can act on. `permanent` = retrying cannot help. */
export function explainNotionError(
  status: number,
  body: string
): { message: string; permanent: boolean } {
  let apiMessage = "";
  try {
    apiMessage = String(JSON.parse(body)?.message ?? "");
  } catch {
    // not JSON
  }
  if (status === 401)
    return {
      message:
        "O Notion não aceitou o token. Gere um novo em notion.so/my-integrations e conecte de novo.",
      permanent: true,
    };
  if (status === 403)
    return {
      message:
        "A integração não tem permissão para inserir neste banco. Em Notion → Conexões, confira se ela está no banco e com acesso de inserção.",
      permanent: true,
    };
  if (status === 404)
    return {
      message:
        "O Notion não encontrou o banco. Abra o banco no Notion, toque em ••• → Conexões e adicione a integração.",
      permanent: true,
    };
  if (status === 400 || status === 422)
    return {
      message: `O Notion recusou os dados${
        apiMessage ? `: ${apiMessage}` : "."
      } Confira as colunas na conexão (botão "Atualizar colunas").`,
      permanent: true,
    };
  if (status === 429)
    return {
      message: "O Notion pediu para esperar (limite de envios).",
      permanent: false,
    };
  return {
    message: `O Notion respondeu HTTP ${status}${
      apiMessage ? `: ${apiMessage}` : ""
    }.`,
    permanent:
      status >= 400 && status < 500 && status !== 408 && status !== 409,
  };
}
