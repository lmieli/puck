// Lead capture forms ("Cadastro" block). The client chooses which fields a
// form asks for; this module turns that definition into rules and checks every
// submission against it on the server, because nothing sent by a browser can
// be trusted. Pure module (no database, no DOM), so every rule is unit-tested.

import { sourceLabel, sanitizeOrigin, type Origin } from "./tracking.ts";

export const FIELD_KINDS = [
  "name",
  "email",
  "phone",
  "whatsapp",
  "company",
  "city",
  "text",
  "longtext",
  "choice",
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

/** Label the editor shows for each kind, and the default question text. */
export const KIND_INFO: Record<FieldKind, { option: string; label: string }> = {
  name: { option: "Nome", label: "Nome" },
  email: { option: "E-mail", label: "E-mail" },
  phone: { option: "Telefone", label: "Telefone" },
  whatsapp: { option: "WhatsApp", label: "WhatsApp" },
  company: { option: "Empresa", label: "Empresa" },
  city: { option: "Cidade", label: "Cidade" },
  text: { option: "Texto curto", label: "Resposta" },
  longtext: { option: "Texto longo", label: "Mensagem" },
  choice: { option: "Lista de opções", label: "Escolha uma opção" },
};

/** One question of a form, as stored in the block. */
export type FieldDef = {
  kind: FieldKind;
  label: string;
  required: boolean;
  /** For "choice": one option per line. */
  options: string;
};

export type FormDef = {
  /** Name of the form ("Lista de espera"), used to filter and export. */
  name: string;
  fields: FieldDef[];
  consentOn: boolean;
  consentText: string;
};

export const MAX_FIELDS = 12;
export const MAX_OPTIONS = 20;
export const MAX_OPTION_LENGTH = 80;
export const DEFAULT_CONSENT =
  "Concordo em compartilhar meus dados para receber contato.";

const CONTACT_KINDS: FieldKind[] = ["email", "phone", "whatsapp"];

const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim();

/** Options typed one per line: trimmed, no blanks, no repeats, within limits. */
export function parseOptions(options: string): string[] {
  const seen = new Set<string>();
  for (const line of String(options ?? "").split(/\r?\n/)) {
    const v = clean(line).slice(0, MAX_OPTION_LENGTH);
    if (v) seen.add(v);
    if (seen.size >= MAX_OPTIONS) break;
  }
  return [...seen];
}

/** The key the browser uses for the i-th field. */
export const fieldKey = (i: number) => `f${i}`;

/**
 * Read the form definition out of a block's props (anything may be missing or
 * of the wrong type: the page JSON is editable data).
 */
export function readForm(props: Record<string, unknown>): FormDef {
  const list = Array.isArray(props.fields) ? props.fields : [];
  const fields: FieldDef[] = [];
  for (const raw of list.slice(0, MAX_FIELDS)) {
    const f = (raw ?? {}) as Record<string, unknown>;
    const kind = FIELD_KINDS.includes(f.kind as FieldKind)
      ? (f.kind as FieldKind)
      : "text";
    fields.push({
      kind,
      label: clean(f.label).slice(0, 80) || KIND_INFO[kind].label,
      required: f.required === true,
      options: String(f.options ?? ""),
    });
  }
  return {
    name: clean(props.formName).slice(0, 60) || "Cadastro",
    fields,
    consentOn: props.consentOn === true,
    consentText: clean(props.consentText).slice(0, 300) || DEFAULT_CONSENT,
  };
}

/** Problems the person editing the form should fix. Empty when fine. */
export function formIssues(form: FormDef): string[] {
  const issues: string[] = [];
  if (!form.fields.length) issues.push("O formulário não tem nenhum campo.");
  else if (!form.fields.some((f) => CONTACT_KINDS.includes(f.kind)))
    issues.push(
      "Inclua pelo menos um campo de e-mail, telefone ou WhatsApp, senão não há como retornar o contato."
    );
  for (const f of form.fields)
    if (f.kind === "choice" && parseOptions(f.options).length < 2)
      issues.push(
        `"${f.label}": informe pelo menos duas opções, uma por linha.`
      );
  return issues;
}

/* ------------------------------------------------------------------ */
/* Checking a submission                                                 */
/* ------------------------------------------------------------------ */

/** One answered question, as saved (labels are copied: the form may change later). */
export type Answer = {
  key: string;
  label: string;
  kind: FieldKind;
  value: string;
};

export type Checked = {
  answers: Answer[];
  /** Fixed columns the dashboard and older code read. */
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Normalised e-mail or phone: same person, same value. Empty when unknown. */
  dedupe: string;
  consent: boolean;
  consentText: string;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_CHARS = /^[0-9+()\-.\s]+$/;

function checkValue(f: FieldDef, raw: string): string {
  switch (f.kind) {
    case "name":
      if (raw.length < 2) throw new Error("informe um nome válido.");
      return raw.slice(0, 120);
    case "email":
      if (raw.length > 200 || !EMAIL.test(raw))
        throw new Error("informe um e-mail válido.");
      return raw;
    case "phone":
    case "whatsapp": {
      const digits = raw.replace(/\D/g, "");
      if (
        raw.length > 40 ||
        !PHONE_CHARS.test(raw) ||
        digits.length < 8 ||
        digits.length > 15
      )
        throw new Error("informe um número válido, com o DDD.");
      return raw;
    }
    case "longtext":
      return raw.slice(0, 2000);
    case "choice": {
      if (!parseOptions(f.options).includes(raw))
        throw new Error("escolha uma das opções da lista.");
      return raw;
    }
    default:
      return raw.slice(0, 200);
  }
}

/**
 * Check what a visitor sent against the form definition. Unknown fields are
 * refused, required ones must be there, every value must fit its kind, and
 * consent must be given when the form asks for it.
 */
export function checkSubmission(
  form: FormDef,
  input: { values: unknown; consent?: unknown }
): { ok: true; value: Checked } | { ok: false; error: string } {
  const values =
    input.values &&
    typeof input.values === "object" &&
    !Array.isArray(input.values)
      ? (input.values as Record<string, unknown>)
      : {};
  const allowed = new Set(form.fields.map((_, i) => fieldKey(i)));
  for (const k of Object.keys(values))
    if (!allowed.has(k))
      return { ok: false, error: "Formulário inválido. Recarregue a página." };
  for (const v of Object.values(values))
    if (typeof v !== "string")
      return { ok: false, error: "Formulário inválido. Recarregue a página." };

  const answers: Answer[] = [];
  for (let i = 0; i < form.fields.length; i++) {
    const f = form.fields[i];
    const key = fieldKey(i);
    const raw =
      f.kind === "longtext"
        ? String(values[key] ?? "")
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
            .trim()
        : clean(values[key]);
    if (!raw) {
      if (f.required)
        return { ok: false, error: `${f.label}: preencha este campo.` };
      continue;
    }
    try {
      answers.push({
        key,
        label: f.label,
        kind: f.kind,
        value: checkValue(f, raw),
      });
    } catch (e) {
      return { ok: false, error: `${f.label}: ${(e as Error).message}` };
    }
  }
  if (!answers.length)
    return { ok: false, error: "Preencha o formulário para enviar." };

  const consent = input.consent === true || input.consent === "on";
  if (form.consentOn && !consent)
    return { ok: false, error: "Para continuar, aceite o uso dos seus dados." };

  const first = (kinds: FieldKind[]) =>
    answers.find((a) => kinds.includes(a.kind))?.value ?? "";
  const email = first(["email"]);
  const phone = first(["phone", "whatsapp"]);
  const dedupe = email ? email.toLowerCase() : phone.replace(/\D/g, "");
  return {
    ok: true,
    value: {
      answers,
      name: first(["name"]),
      email,
      phone,
      message: first(["longtext"]),
      dedupe,
      consent: form.consentOn && consent,
      consentText: form.consentOn ? form.consentText : "",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Stored leads: reading, CSV, webhook, e-mail                           */
/* ------------------------------------------------------------------ */

/** A lead row as the database returns it. */
export type LeadRow = {
  id: string;
  page: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  origin: string;
  form: string;
  data: string;
  consent: number;
  created_at: string;
};

/** Name shown for leads that came from the classic contact form. */
export const CLASSIC_FORM = "Formulário de contato";
export const formLabel = (form: string) => form || CLASSIC_FORM;

/** The answers of a lead. Older leads (no snapshot) are rebuilt from their fixed columns. */
export function answersOf(lead: LeadRow): Answer[] {
  try {
    const d = JSON.parse(lead.data || "null");
    if (d && Array.isArray(d.answers))
      return (d.answers as Answer[]).filter(
        (a) => a && typeof a.label === "string" && typeof a.value === "string"
      );
  } catch {
    // fall through to the fixed columns
  }
  const out: Answer[] = [];
  const add = (key: string, label: string, kind: FieldKind, value: string) => {
    if (value) out.push({ key, label, kind, value });
  };
  add("name", "Nome", "name", lead.name);
  add("email", "E-mail", "email", lead.email);
  add("phone", "Telefone", "phone", lead.phone);
  add("message", "Mensagem", "longtext", lead.message);
  return out;
}

export function originOf(lead: Pick<LeadRow, "origin">): Origin {
  try {
    return sanitizeOrigin(JSON.parse(lead.origin || "{}"));
  } catch {
    return {};
  }
}

/** A cell that a spreadsheet could run as a formula gets a leading quote. */
export function csvCell(value: string, sep: string): string {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return v.includes(sep) || /["\r\n]/.test(v)
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

/**
 * Leads as CSV: date, form, one column per question (the union over the
 * leads, in the order first seen), page, origin and consent. UTF-8 with a BOM
 * so Excel reads the accents; the separator is chosen by the caller (Brazilian
 * Excel wants ";", Google Sheets "," ).
 */
export function leadsToCsv(leads: LeadRow[], sep: ";" | "," = ";"): string {
  const labels: string[] = [];
  const parsed = leads.map((l) => {
    const answers = answersOf(l);
    for (const a of answers)
      if (!labels.includes(a.label)) labels.push(a.label);
    return { l, answers };
  });
  const header = [
    "Data",
    "Formulário",
    ...labels,
    "Página",
    "Origem",
    "Consentimento",
  ];
  const lines = [header.map((h) => csvCell(h, sep)).join(sep)];
  for (const { l, answers } of parsed) {
    const byLabel = new Map<string, string[]>();
    for (const a of answers)
      byLabel.set(a.label, [...(byLabel.get(a.label) ?? []), a.value]);
    const row = [
      l.created_at,
      formLabel(l.form),
      ...labels.map((label) => (byLabel.get(label) ?? []).join(" | ")),
      l.page,
      sourceLabel(originOf(l)),
      l.consent ? "sim" : "",
    ];
    lines.push(row.map((c) => csvCell(c, sep)).join(sep));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** What a webhook receives. Stable on purpose: other people build on it. */
export function webhookPayload(
  lead: LeadRow,
  site: { slug: string; name: string },
  event: "lead.created" | "lead.test" = "lead.created"
) {
  const answers = answersOf(lead);
  let consentText = "";
  try {
    consentText = JSON.parse(lead.data || "{}")?.consentText ?? "";
  } catch {
    // no snapshot
  }
  return {
    event,
    id: lead.id,
    created_at: lead.created_at,
    site: { slug: site.slug, name: site.name },
    form: formLabel(lead.form),
    page: lead.page,
    fields: answers.map((a) => ({
      label: a.label,
      kind: a.kind,
      value: a.value,
    })),
    contact: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
    },
    origin: originOf(lead),
    consent: { given: !!lead.consent, text: consentText },
  };
}

/** The notice e-mailed to the people who handle new leads. Plain text, one line subject. */
export function leadEmail(
  lead: LeadRow,
  site: { name: string },
  dashboardUrl: string
): { subject: string; text: string } {
  const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
  const answers = answersOf(lead);
  const who = lead.name || lead.email || lead.phone || "alguém";
  const subject = oneLine(
    `Novo cadastro em ${site.name}: ${formLabel(lead.form)} (${who})`
  ).slice(0, 200);
  const lines = [
    `Chegou um novo cadastro em ${site.name}.`,
    `Formulário: ${formLabel(lead.form)}`,
    "",
    ...answers.map((a) => `${a.label}: ${a.value}`),
    "",
    `Página: ${lead.page}`,
    `Origem: ${sourceLabel(originOf(lead))}`,
    `Quando: ${lead.created_at} (UTC)`,
    "",
    `Ver no painel: ${dashboardUrl}`,
  ];
  return { subject, text: lines.join("\n") };
}
