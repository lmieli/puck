// Lead capture forms: reading the definition, checking submissions, CSV,
// webhook payload and e-mail.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  answersOf,
  checkSubmission,
  csvCell,
  formIssues,
  leadEmail,
  leadsToCsv,
  parseOptions,
  readForm,
  webhookPayload,
  type FormDef,
  type LeadRow,
} from "../lib/signup.ts";

const form = (over: Partial<FormDef> = {}): FormDef => ({
  name: "Lista de espera",
  consentOn: false,
  consentText: "",
  fields: [
    { kind: "name", label: "Nome", required: true, options: "" },
    { kind: "email", label: "E-mail", required: true, options: "" },
    { kind: "phone", label: "Telefone", required: false, options: "" },
    {
      kind: "choice",
      label: "Interesse",
      required: false,
      options: "2 quartos\n3 quartos\nCobertura",
    },
  ],
  ...over,
});
const ok = (f: FormDef, values: Record<string, unknown>, consent?: unknown) => {
  const r = checkSubmission(f, { values, consent });
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.value;
};
const bad = (f: FormDef, values: unknown, consent?: unknown) => {
  const r = checkSubmission(f, { values, consent });
  assert.ok(!r.ok, "should have been refused");
  return r.ok ? "" : r.error;
};

test("options are one per line, trimmed, without blanks or repeats", () => {
  assert.deepEqual(parseOptions(" A \n\nB\r\nA\n  \nC"), ["A", "B", "C"]);
  assert.equal(
    parseOptions(Array.from({ length: 50 }, (_, i) => `o${i}`).join("\n"))
      .length,
    20
  );
  assert.equal(parseOptions("x".repeat(200))[0].length, 80);
  assert.deepEqual(parseOptions(""), []);
});

test("a form definition is read defensively from the block props", () => {
  const f = readForm({
    formName: "  Newsletter ",
    fields: [
      { kind: "email", label: " E-mail ", required: true },
      { kind: "hacker", label: "", required: "yes" },
      null,
      ...Array.from({ length: 30 }, () => ({ kind: "text", label: "x" })),
    ],
    consentOn: true,
  });
  assert.equal(f.name, "Newsletter");
  assert.equal(f.fields.length, 12, "capped");
  assert.equal(f.fields[0].label, "E-mail");
  assert.equal(f.fields[1].kind, "text", "unknown kind falls back");
  assert.equal(f.fields[1].label, "Resposta", "empty label gets the default");
  assert.equal(f.fields[1].required, false, "only true means required");
  assert.equal(f.consentOn, true);
  assert.match(f.consentText, /Concordo/);
  assert.equal(readForm({}).name, "Cadastro");
  assert.deepEqual(readForm({ fields: "nope" }).fields, []);
});

test("editing problems are reported in plain words", () => {
  assert.deepEqual(formIssues(form()), []);
  assert.match(formIssues(form({ fields: [] }))[0], /nenhum campo/);
  assert.match(
    formIssues(
      form({
        fields: [{ kind: "name", label: "Nome", required: true, options: "" }],
      })
    )[0],
    /e-mail, telefone ou WhatsApp/
  );
  assert.match(
    formIssues(
      form({
        fields: [
          { kind: "email", label: "E-mail", required: true, options: "" },
          {
            kind: "choice",
            label: "Interesse",
            required: false,
            options: "só uma",
          },
        ],
      })
    )[0],
    /pelo menos duas opções/
  );
});

test("a valid submission is accepted and mapped to the fixed columns", () => {
  const v = ok(form(), {
    f0: " Maria Souza ",
    f1: "Maria@Exemplo.com",
    f2: "(11) 91234-5678",
    f3: "3 quartos",
  });
  assert.equal(v.name, "Maria Souza");
  assert.equal(v.email, "Maria@Exemplo.com");
  assert.equal(v.phone, "(11) 91234-5678");
  assert.equal(v.dedupe, "maria@exemplo.com", "e-mail, lower case");
  assert.deepEqual(
    v.answers.map((a) => [a.label, a.value]),
    [
      ["Nome", "Maria Souza"],
      ["E-mail", "Maria@Exemplo.com"],
      ["Telefone", "(11) 91234-5678"],
      ["Interesse", "3 quartos"],
    ]
  );
});

test("a compact form with only an e-mail works, and without an e-mail the phone identifies the person", () => {
  const compact = form({
    fields: [{ kind: "email", label: "E-mail", required: true, options: "" }],
  });
  const v = ok(compact, { f0: "a@b.co" });
  assert.equal(v.name, "");
  assert.equal(v.dedupe, "a@b.co");
  const phoneOnly = form({
    fields: [
      { kind: "whatsapp", label: "WhatsApp", required: true, options: "" },
    ],
  });
  assert.equal(
    ok(phoneOnly, { f0: "+55 (11) 91234-5678" }).dedupe,
    "5511912345678"
  );
});

test("required fields must be filled, with the question named in the message", () => {
  assert.match(bad(form(), { f0: "Maria" }), /E-mail: preencha este campo/);
  assert.match(bad(form(), { f0: "  ", f1: "a@b.co" }), /Nome: preencha/);
  assert.match(bad(form(), {}), /preencha/i);
});

test("every value must fit its kind", () => {
  assert.match(
    bad(form(), { f0: "M", f1: "a@b.co" }),
    /Nome: informe um nome válido/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: "not-an-email" }),
    /E-mail: informe um e-mail válido/
  );
  assert.match(bad(form(), { f0: "Maria", f1: "a@b" }), /E-mail/);
  assert.match(
    bad(form(), { f0: "Maria", f1: "a@b.co", f2: "abc" }),
    /Telefone: informe um número válido/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: "a@b.co", f2: "123" }),
    /Telefone/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: "a@b.co", f2: "1".repeat(20) }),
    /Telefone/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: "a@b.co", f3: "Mansão" }),
    /Interesse: escolha uma das opções/
  );
});

test("optional fields may be left out, and are not stored when empty", () => {
  const v = ok(form(), { f0: "Maria", f1: "a@b.co", f2: "", f3: "" });
  assert.deepEqual(
    v.answers.map((a) => a.label),
    ["Nome", "E-mail"]
  );
});

test("anything the form does not ask for is refused", () => {
  assert.match(
    bad(form(), { f0: "Maria", f1: "a@b.co", f9: "extra" }),
    /Formulário inválido/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: "a@b.co", admin: "1" }),
    /Formulário inválido/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: ["a@b.co"] }),
    /Formulário inválido/
  );
  assert.match(
    bad(form(), { f0: "Maria", f1: { x: 1 } }),
    /Formulário inválido/
  );
  assert.match(bad(form(), "string"), /preencha|inválido/i);
  assert.match(bad(form(), null), /preencha/i);
  assert.match(bad(form(), [1, 2]), /preencha/i);
});

test("consent is required when the form asks for it, and recorded when given", () => {
  const f = form({ consentOn: true, consentText: "Aceito receber contato." });
  const base = { f0: "Maria", f1: "a@b.co" };
  assert.match(bad(f, base), /aceite o uso dos seus dados/);
  assert.match(bad(f, base, false), /aceite/);
  const v = ok(f, base, true);
  assert.equal(v.consent, true);
  assert.equal(v.consentText, "Aceito receber contato.");
  assert.equal(ok(f, base, "on").consent, true);
  // A form without consent records none, even if the browser sends it.
  const none = ok(form(), base, true);
  assert.equal(none.consent, false);
  assert.equal(none.consentText, "");
});

test("long values are cut and control characters removed", () => {
  const f = form({
    fields: [
      { kind: "email", label: "E-mail", required: true, options: "" },
      { kind: "text", label: "Obs", required: false, options: "" },
      { kind: "longtext", label: "Mensagem", required: false, options: "" },
    ],
  });
  const v = ok(f, {
    f0: "a@b.co",
    f1: `x${"y".repeat(500)}\u0000\u0007`,
    f2: `linha 1\nlinha 2${"z".repeat(3000)}`,
  });
  assert.equal(v.answers[1].value.length, 200);
  assert.equal(/[\u0000\u0007]/.test(v.answers[1].value), false);
  assert.ok(
    v.answers[2].value.startsWith("linha 1\nlinha 2"),
    "newlines kept in long text"
  );
  assert.equal(v.answers[2].value.length, 2000);
  assert.equal(v.message, v.answers[2].value);
});

/* ------------------------------ stored leads ------------------------------ */

const lead = (over: Partial<LeadRow> = {}): LeadRow => ({
  id: "L1",
  page: "/",
  name: "",
  email: "",
  phone: "",
  message: "",
  origin: "",
  form: "",
  data: "",
  consent: 0,
  created_at: "2026-11-02 12:00:00",
  ...over,
});

test("old leads without a snapshot are rebuilt from their fixed columns", () => {
  const a = answersOf(
    lead({
      name: "Ana",
      email: "ana@x.co",
      phone: "11999990000",
      message: "Oi",
    })
  );
  assert.deepEqual(
    a.map((x) => [x.label, x.value]),
    [
      ["Nome", "Ana"],
      ["E-mail", "ana@x.co"],
      ["Telefone", "11999990000"],
      ["Mensagem", "Oi"],
    ]
  );
  assert.deepEqual(
    answersOf(lead({ data: "not json", name: "Ana" })).map((x) => x.value),
    ["Ana"]
  );
});

test("CSV: one column per question, union over leads, quoted and safe", () => {
  const l1 = lead({
    id: "1",
    form: "Lista de espera",
    data: JSON.stringify({
      answers: [
        { key: "f0", label: "Nome", kind: "name", value: "Maria" },
        { key: "f1", label: "E-mail", kind: "email", value: "m@x.co" },
      ],
    }),
    consent: 1,
    origin: JSON.stringify({ utm_source: "google", utm_medium: "cpc" }),
  });
  const l2 = lead({
    id: "2",
    form: "Lista de espera",
    data: JSON.stringify({
      answers: [
        { key: "f0", label: "Nome", kind: "name", value: 'José "Zé"; Silva' },
        { key: "f2", label: "Cidade", kind: "city", value: "Campinas" },
      ],
    }),
  });
  const l3 = lead({
    id: "3",
    name: "Contato antigo",
    email: "old@x.co",
    message: "Oi",
  });
  const csv = leadsToCsv([l1, l2, l3], ";");
  assert.ok(csv.startsWith("﻿"), "BOM for Excel");
  const lines = csv.trim().replace("﻿", "").split("\r\n");
  assert.equal(
    lines[0],
    "Data;Formulário;Nome;E-mail;Cidade;Mensagem;Página;Origem;Consentimento"
  );
  assert.equal(
    lines[1],
    "2026-11-02 12:00:00;Lista de espera;Maria;m@x.co;;;/;google / cpc;sim"
  );
  assert.ok(
    lines[2].includes('"José ""Zé""; Silva"'),
    "quotes doubled, cell quoted"
  );
  assert.ok(
    lines[3].startsWith(
      "2026-11-02 12:00:00;Formulário de contato;Contato antigo;old@x.co"
    )
  );
  assert.equal(
    leadsToCsv([l1], ",").split("\r\n")[0].includes(","),
    true,
    "comma separator"
  );
  const empty = leadsToCsv([], ";");
  assert.ok(empty.startsWith("\uFEFF"), "BOM even with no leads");
  assert.equal(
    empty.slice(1).trim(),
    "Data;Formulário;Página;Origem;Consentimento"
  );
});

test("CSV cells that a spreadsheet could run as a formula are neutralised", () => {
  for (const evil of [
    '=HYPERLINK("http://evil")',
    "+1+1",
    "-2+3",
    "@SUM(A1)",
    "\tcmd",
    "\rcmd",
  ])
    assert.ok(csvCell(evil, ";").replace(/^"/, "").startsWith("'"), evil);
  assert.equal(csvCell("normal", ";"), "normal");
  assert.equal(csvCell("a;b", ";"), '"a;b"');
  assert.equal(
    csvCell("a;b", ","),
    "a;b",
    "only the active separator forces quotes"
  );
  assert.equal(csvCell("duas\nlinhas", ";"), '"duas\nlinhas"');
});

test("the webhook payload is stable and complete", () => {
  const l = lead({
    id: "abc",
    form: "Newsletter",
    page: "/contato",
    name: "Ana",
    email: "ana@x.co",
    consent: 1,
    origin: JSON.stringify({ utm_source: "instagram" }),
    data: JSON.stringify({
      answers: [{ key: "f0", label: "Nome", kind: "name", value: "Ana" }],
      consentText: "Aceito.",
    }),
  });
  assert.deepEqual(webhookPayload(l, { slug: "gemini", name: "Gemini" }), {
    event: "lead.created",
    id: "abc",
    created_at: "2026-11-02 12:00:00",
    site: { slug: "gemini", name: "Gemini" },
    form: "Newsletter",
    page: "/contato",
    fields: [{ label: "Nome", kind: "name", value: "Ana" }],
    contact: { name: "Ana", email: "ana@x.co", phone: "", message: "" },
    origin: { utm_source: "instagram" },
    consent: { given: true, text: "Aceito." },
  });
});

test("the notice e-mail has a one-line subject even with hostile input", () => {
  const l = lead({
    form: "Lista\r\nBcc: evil@x.co",
    name: "Ana\nSubject: x",
    data: JSON.stringify({
      answers: [{ key: "f0", label: "Nome", kind: "name", value: "Ana" }],
    }),
  });
  const m = leadEmail(l, { name: "Gemini" }, "https://app/painel");
  assert.equal(/[\r\n]/.test(m.subject), false);
  assert.ok(m.subject.length <= 200);
  assert.match(m.text, /Nome: Ana/);
  assert.match(m.text, /Ver no painel: https:\/\/app\/painel/);
});

/* ------------------------------ the AI and the editor ------------------------------ */

import { applyOperation, emptyPage, OpError } from "../ai/page-ops.ts";
import { blockCatalog } from "../ai/prompt.ts";

test("the AI can add a Cadastro block, with defaults filled in", () => {
  const r = applyOperation(emptyPage("t"), "insert_block", {
    type: "Signup",
    props: {
      formName: "Newsletter",
      layout: "compact",
      fields: [
        { kind: "email", label: "Seu e-mail", required: true, options: "" },
      ],
    },
  });
  const block = r.page.content[0];
  assert.equal(block.type, "Signup");
  assert.equal(block.props.layout, "compact");
  assert.equal(
    block.props.consentOn,
    true,
    "the LGPD checkbox is on by default"
  );
  assert.ok(
    block.props.id,
    "has an id, which the server uses to find the form"
  );
  const form = readForm(block.props);
  assert.deepEqual(formIssues(form), []);
});

test("the block's own rules reject nonsense from the AI", () => {
  const add = (props: Record<string, unknown>) =>
    applyOperation(emptyPage("t"), "insert_block", { type: "Signup", props });
  assert.throws(() => add({ layout: "giant" }), OpError);
  assert.throws(
    () =>
      add({
        fields: [
          { kind: "password", label: "Senha", required: true, options: "" },
        ],
      }),
    OpError
  );
  assert.throws(() => add({ fields: "nome, email" }), OpError);
  assert.throws(
    () =>
      add({
        fields: Array.from({ length: 13 }, () => ({
          kind: "text",
          label: "x",
          required: false,
          options: "",
        })),
      }),
    OpError
  );
});

test("the catalog the AI reads describes the Cadastro block and its field kinds", () => {
  const catalog = JSON.stringify(blockCatalog());
  assert.match(catalog, /"Signup"/);
  assert.match(catalog, /lista de espera/i);
  for (const kind of ["name", "email", "whatsapp", "choice"])
    assert.ok(catalog.includes(`"${kind}"`), kind);
});
