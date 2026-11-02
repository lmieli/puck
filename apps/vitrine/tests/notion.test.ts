// Notion destination: parsing what people paste, the column mapping, value
// conversion, error reading, the per-form filter on the queue, and a real
// delivery against a fake Notion API.

import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import Database from "better-sqlite3";
import { DeliveryError, enqueue } from "../lib/deliveries-core.ts";
import {
  answerSource,
  buildPage,
  convertValue,
  explainNotionError,
  isTokenShape,
  matchesForm,
  parseDatabaseId,
  parseScope,
  readDatabase,
  reconcileMapping,
  scopeValue,
  sourceValue,
  suggestMapping,
  type Mapping,
} from "../lib/notion.ts";
import { createLeadPage } from "../lib/notion-send.ts";
import { deriveKey, encrypt } from "../lib/secrets.ts";
import type { LeadRow } from "../lib/signup.ts";
import { INDEXES, SCHEMA } from "../lib/schema.ts";

const lead: LeadRow = {
  id: "L1",
  page: "/contato",
  name: "Maria Souza",
  email: "maria@exemplo.com",
  phone: "(11) 91234-5678",
  message: "",
  origin: JSON.stringify({ utm_source: "google", utm_medium: "cpc" }),
  form: "Lista de espera",
  data: JSON.stringify({
    answers: [
      { key: "f0", label: "Nome", kind: "name", value: "Maria Souza" },
      { key: "f1", label: "E-mail", kind: "email", value: "maria@exemplo.com" },
      { key: "f2", label: "Interesse", kind: "choice", value: "3 quartos" },
      { key: "f3", label: "Orçamento", kind: "text", value: "1.500,50" },
    ],
    consentText: "",
  }),
  consent: 1,
  created_at: "2026-11-02 12:30:00",
};

const dbJson = {
  object: "database",
  title: [{ plain_text: "Leads do site" }],
  properties: {
    Nome: { id: "title", name: "Nome", type: "title" },
    "E-mail": { id: "a1", name: "E-mail", type: "email" },
    Telefone: { id: "a2", name: "Telefone", type: "phone_number" },
    Interesse: { id: "a3", name: "Interesse", type: "select" },
    Orçamento: { id: "a4", name: "Orçamento", type: "number" },
    Origem: { id: "a5", name: "Origem", type: "rich_text" },
    "Criado em": { id: "a6", name: "Criado em", type: "created_time" },
    Responsável: { id: "a7", name: "Responsável", type: "people" },
    "Recebido em": { id: "a8", name: "Recebido em", type: "date" },
  },
};

test("a database is found from what people paste", () => {
  const id = "0123456789abcdef0123456789abcdef";
  const dashed = "01234567-89ab-cdef-0123-456789abcdef";
  assert.equal(parseDatabaseId(id), dashed);
  assert.equal(parseDatabaseId(dashed), dashed);
  assert.equal(
    parseDatabaseId(
      `https://www.notion.so/minha-empresa/Leads-${id}?v=ffffffffffffffffffffffffffffffff&pvs=4`
    ),
    dashed,
    "the view id after ?v= is not the database"
  );
  assert.equal(parseDatabaseId(`https://www.notion.so/${id}`), dashed);
  assert.equal(parseDatabaseId("https://evil.example.com/" + id), null);
  assert.equal(parseDatabaseId("não é link"), null);
  assert.equal(parseDatabaseId(""), null);
});

test("tokens are recognised by shape", () => {
  assert.ok(isTokenShape("ntn_" + "a".repeat(40)));
  assert.ok(isTokenShape("secret_" + "A1".repeat(20)));
  assert.equal(isTokenShape("abc"), false);
  assert.equal(isTokenShape("https://notion.so"), false);
});

test("only writable columns are offered, title first", () => {
  const db = readDatabase(dbJson);
  assert.equal(db.title, "Leads do site");
  const names = db.columns.map((c) => c.name);
  assert.equal(names[0], "Nome");
  assert.equal(names.includes("Criado em"), false, "created_time is read-only");
  assert.equal(
    names.includes("Responsável"),
    false,
    "people cannot be written"
  );
  assert.equal(db.columns.length, 7);
});

test("the first mapping guess matches columns by name and type", () => {
  const cols = readDatabase(dbJson).columns;
  const m = suggestMapping(cols, ["Nome", "E-mail", "Interesse", "Orçamento"]);
  const by = Object.fromEntries(m.map((x) => [x.property, x.source]));
  assert.equal(by["Nome"], "name");
  assert.equal(by["E-mail"], "email");
  assert.equal(by["Telefone"], "phone");
  assert.equal(by["Interesse"], answerSource("Interesse"));
  assert.equal(by["Orçamento"], answerSource("Orçamento"));
  assert.equal(by["Origem"], "source");
  assert.equal(by["Recebido em"], "created");
});

test("values are converted to what each column type expects", () => {
  assert.deepEqual(convertValue("title", "Ana"), {
    title: [{ text: { content: "Ana" } }],
  });
  assert.equal(convertValue("rich_text", ""), null);
  assert.deepEqual(convertValue("number", "1.500,50"), { number: 1500.5 });
  assert.equal(convertValue("number", "muito"), null);
  assert.equal(convertValue("url", "javascript:alert(1)"), null);
  assert.deepEqual(convertValue("url", "https://x.co"), {
    url: "https://x.co",
  });
  assert.deepEqual(convertValue("select", "a, b"), {
    select: { name: "a  b" },
  });
  assert.deepEqual(convertValue("multi_select", "a, b;c"), {
    multi_select: [{ name: "a" }, { name: "b" }, { name: "c" }],
  });
  assert.deepEqual(convertValue("date", "2026-11-02 12:30:00"), {
    date: { start: "2026-11-02T12:30:00Z" },
  });
  assert.deepEqual(convertValue("checkbox", "sim"), { checkbox: true });
  assert.deepEqual(convertValue("checkbox", "não"), { checkbox: false });
  const long = convertValue("rich_text", "x".repeat(5000)) as any;
  assert.ok(
    long.rich_text[0].text.content.length <= 2000,
    "Notion limits text to 2000"
  );
});

test("a page is built from the mapping, and the title is never empty", () => {
  const cols = readDatabase(dbJson).columns;
  const mapping = suggestMapping(cols, ["Interesse", "Orçamento"]);
  const page = buildPage("DB1", mapping, lead);
  assert.equal(page.parent.database_id, "DB1");
  const p = page.properties as Record<string, any>;
  assert.equal(p["Nome"].title[0].text.content, "Maria Souza");
  assert.equal(p["E-mail"].email, "maria@exemplo.com");
  assert.equal(p["Interesse"].select.name, "3 quartos");
  assert.equal(p["Orçamento"].number, 1500.5);
  assert.equal(p["Origem"].rich_text[0].text.content.length > 0, true);
  assert.equal(p["Recebido em"].date.start, "2026-11-02T12:30:00Z");

  // Title mapped to something the lead left blank: fall back to the name or e-mail.
  const odd: Mapping = [{ property: "Nome", type: "title", source: "message" }];
  const fb = buildPage("DB1", odd, lead).properties as Record<string, any>;
  assert.equal(fb["Nome"].title[0].text.content, "Maria Souza");
  const noName = buildPage("DB1", odd, { ...lead, name: "" })
    .properties as Record<string, any>;
  assert.equal(noName["Nome"].title[0].text.content, "maria@exemplo.com");
  // Unmapped columns are simply absent.
  const none = buildPage(
    "DB1",
    [{ property: "Telefone", type: "phone_number", source: "" }],
    lead
  );
  assert.deepEqual(none.properties, {});
});

test("answers are found by question label, ignoring case and accents", () => {
  assert.equal(sourceValue(lead, answerSource("INTERESSE")), "3 quartos");
  assert.equal(sourceValue(lead, answerSource("orcamento")), "1.500,50");
  assert.equal(sourceValue(lead, answerSource("Inexistente")), "");
  assert.equal(sourceValue(lead, "form"), "Lista de espera");
  assert.equal(sourceValue(lead, "consent"), "sim");
});

test("re-reading columns keeps the client's choices and adds new columns empty", () => {
  const cols = readDatabase(dbJson).columns;
  const old = suggestMapping(cols, []).map((m) =>
    m.property === "Telefone" ? { ...m, source: "whatsapp" } : m
  );
  // "Telefone" is renamed in Notion (same id), "Prioridade" is new, "Origem" is gone.
  const next = readDatabase({
    ...dbJson,
    properties: {
      ...Object.fromEntries(
        Object.entries(dbJson.properties).filter(
          ([k]) => k !== "Origem" && k !== "Telefone"
        )
      ),
      Celular: { id: "a2", name: "Celular", type: "phone_number" },
      Prioridade: { id: "z9", name: "Prioridade", type: "select" },
    },
  }).columns;
  const re = reconcileMapping(next, old, cols);
  const by = Object.fromEntries(re.map((m) => [m.property, m.source]));
  assert.equal(by["Celular"], "whatsapp", "rename keeps the choice");
  assert.equal(by["Prioridade"], "");
  assert.equal("Origem" in by, false);
});

test("form scope: all, the classic form, or one form by name", () => {
  assert.equal(parseScope("all"), null);
  assert.equal(parseScope("classic"), "");
  assert.equal(parseScope("Lista de espera"), "Lista de espera");
  assert.equal(scopeValue(null), "all");
  assert.equal(scopeValue(""), "classic");
  assert.ok(matchesForm(null, "qualquer"));
  assert.ok(matchesForm(undefined, "qualquer"));
  assert.ok(matchesForm("A", "A"));
  assert.equal(matchesForm("A", "B"), false);
  assert.ok(matchesForm("", ""), "classic form");
  assert.equal(matchesForm("", "A"), false);
});

test("Notion errors become instructions", () => {
  assert.match(explainNotionError(401, "{}").message, /token/);
  assert.equal(explainNotionError(401, "{}").permanent, true);
  assert.match(explainNotionError(404, "{}").message, /Conexões/);
  const bad = explainNotionError(
    400,
    JSON.stringify({ message: "Interesse is not a property" })
  );
  assert.match(bad.message, /Interesse is not a property/);
  assert.equal(bad.permanent, true);
  assert.equal(explainNotionError(429, "{}").permanent, false);
  assert.equal(explainNotionError(503, "{}").permanent, false);
});

test("the queue sends a lead only to destinations that serve its form", () => {
  const conn = new Database(":memory:");
  conn.exec(SCHEMA);
  conn.exec(INDEXES);
  conn
    .prepare("INSERT INTO sites (id, slug, name) VALUES ('S1', 'g', 'G')")
    .run();
  const addLead = (id: string, form: string) =>
    conn
      .prepare(
        "INSERT INTO leads (id, site_id, page, name, email, form) VALUES (?, 'S1', '/', 'A', 'a@x.co', ?)"
      )
      .run(id, form);
  const add = (id: string, kind: string, cfg: object) =>
    conn
      .prepare(
        "INSERT INTO integrations (id, site_id, kind, name, config) VALUES (?, 'S1', ?, ?, ?)"
      )
      .run(id, kind, id, JSON.stringify(cfg));
  add("all", "notion", { form: null });
  add("espera", "notion", { form: "Lista de espera" });
  add("classic", "notion", { form: "" });
  add("hook", "webhook", { url: "x", secret: "y" });
  addLead("L1", "Lista de espera");
  addLead("L2", "");
  addLead("L3", "Orçamento");
  const targets = (leadId: string) => {
    enqueue(conn, "S1", leadId);
    return (
      conn
        .prepare(
          "SELECT integration_id FROM deliveries WHERE lead_id = ? ORDER BY integration_id"
        )
        .all(leadId) as {
        integration_id: string;
      }[]
    ).map((r) => r.integration_id);
  };
  assert.deepEqual(targets("L1"), ["all", "espera", "hook"]);
  assert.deepEqual(targets("L2"), ["all", "classic", "hook"]);
  assert.deepEqual(targets("L3"), ["all", "hook"]);
});

test("delivery creates the page with the client's token and reports Notion's answer", async () => {
  const seen: { auth?: string; version?: string; body: any }[] = [];
  let status = 200;
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen.push({
        auth: req.headers.authorization,
        version: req.headers["notion-version"] as string,
        body: raw ? JSON.parse(raw) : null,
      });
      res.writeHead(status, { "content-type": "application/json" });
      res.end(
        status === 200
          ? JSON.stringify({ object: "page", id: "page-1" })
          : JSON.stringify({
              message: "Interesse is not a property that exists.",
            })
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  process.env.NOTION_API_BASE = `http://127.0.0.1:${
    (server.address() as AddressInfo).port
  }`;

  const key = deriveKey("test-secret");
  const cols = readDatabase(dbJson).columns;
  const config = {
    token: encrypt("ntn_" + "a".repeat(40), key),
    hint: "aaaa",
    databaseId: "DB1",
    dbTitle: "Leads do site",
    form: "Lista de espera",
    columns: cols,
    mapping: suggestMapping(cols, ["Interesse", "Orçamento"]),
  };
  const id = await createLeadPage({ config, lead, key });
  assert.equal(id, "page-1");
  assert.equal(seen[0].auth, "Bearer ntn_" + "a".repeat(40));
  assert.equal(seen[0].version, "2022-06-28");
  assert.equal(seen[0].body.parent.database_id, "DB1");
  assert.equal(seen[0].body.properties["E-mail"].email, "maria@exemplo.com");

  status = 400;
  await assert.rejects(
    () => createLeadPage({ config, lead, key }),
    (e: unknown) =>
      e instanceof DeliveryError &&
      e.permanent === true &&
      /Interesse is not a property/.test(e.message)
  );
  status = 503;
  await assert.rejects(
    () => createLeadPage({ config, lead, key }),
    (e: unknown) => e instanceof DeliveryError && e.permanent === false
  );

  // A token sealed with another key cannot be read: a clear, permanent error.
  await assert.rejects(
    () => createLeadPage({ config, lead, key: deriveKey("outra") }),
    (e: unknown) => e instanceof DeliveryError && e.permanent === true
  );
  server.closeAllConnections();
  server.close();
});
