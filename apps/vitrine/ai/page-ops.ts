// Pure, testable operations the AI agent applies to a page. Every operation
// validates its input against the block schema and returns a human-readable
// result that is sent back to the model.

import { z } from "zod";
import {
  blocks,
  blockNames,
  defaultsFor,
  fieldsFor,
  rootDefaults,
  rootFields,
  type BlockName,
  type FieldDef,
} from "../blocks/schema.ts";

export type Block = {
  type: string;
  props: Record<string, unknown> & { id: string };
};
export type PageData = {
  root: { props: Record<string, unknown> };
  content: Block[];
  zones?: Record<string, unknown>;
};

export class OpError extends Error {}

const HEX = /^#[0-9a-fA-F]{6}$/;

function zodFor(field: FieldDef): z.ZodTypeAny {
  switch (field.type) {
    case "text":
    case "textarea":
    case "image":
      return z.string().max(4000);
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "color":
      return field.optional
        ? z.union([
            z.literal(""),
            z.string().regex(HEX, "cor deve estar no formato #rrggbb ou vazia"),
          ])
        : z.string().regex(HEX, "cor deve estar no formato #rrggbb");
    case "select":
      return z.enum(field.options.map((o) => o.value) as [string, ...string[]]);
    case "list": {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [k, f] of Object.entries(field.item)) shape[k] = zodFor(f);
      const arr = z.array(z.object(shape).partial().strict());
      return field.max ? arr.max(field.max) : arr;
    }
  }
}

const schemaCache = new Map<string, z.ZodObject<z.ZodRawShape>>();

export function propsSchema(type: BlockName) {
  let s = schemaCache.get(type);
  if (!s) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [k, f] of Object.entries(fieldsFor(type))) {
      shape[k] = zodFor(f);
    }
    s = z.object(shape);
    schemaCache.set(type, s);
  }
  return s;
}

const rootSchema = (() => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [k, f] of Object.entries(rootFields as Record<string, FieldDef>))
    shape[k] = zodFor(f);
  return z.object(shape).partial().strict();
})();

/** Validate (partial) page-level settings; used by the AI and "apply to all pages". */
export function validateRoot(props: unknown) {
  const parsed = rootSchema.safeParse(props ?? {});
  if (!parsed.success)
    throw new OpError(`Configurações inválidas: ${formatZod(parsed.error)}.`);
  return parsed.data as Record<string, unknown>;
}

function formatZod(err: z.ZodError) {
  return err.issues
    .map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`)
    .slice(0, 8)
    .join("; ");
}

function assertType(type: unknown): BlockName {
  if (typeof type !== "string" || !(blockNames as string[]).includes(type)) {
    throw new OpError(
      `Bloco desconhecido "${String(type)}". Use um destes: ${blockNames.join(
        ", "
      )}.`
    );
  }
  return type as BlockName;
}

/** Fill list items with the item field defaults so partial items still render. */
function normalizeLists(type: BlockName, props: Record<string, unknown>) {
  for (const [k, f] of Object.entries(fieldsFor(type))) {
    if (f.type === "list" && Array.isArray(props[k])) {
      props[k] = (props[k] as Record<string, unknown>[]).map((item) => {
        const filled: Record<string, unknown> = {};
        for (const [ik, ifield] of Object.entries(f.item)) {
          filled[ik] =
            item[ik] ??
            (ifield.type === "boolean"
              ? false
              : ifield.type === "number"
              ? 0
              : ifield.type === "select"
              ? ifield.options[0].value
              : "");
        }
        return filled;
      });
    }
  }
  return props;
}

export function validateProps(
  type: BlockName,
  props: unknown,
  partial: boolean
) {
  const schema = propsSchema(type);
  const parsed = (partial ? schema.partial() : schema)
    .strict()
    .safeParse(props ?? {});
  if (!parsed.success) {
    const allowed = Object.keys(fieldsFor(type)).join(", ");
    throw new OpError(
      `Props inválidas para ${type}: ${formatZod(
        parsed.error
      )}. Campos aceitos: ${allowed}.`
    );
  }
  return parsed.data as Record<string, unknown>;
}

let counter = 0;
export function newId(type: string) {
  counter = (counter + 1) % 1e6;
  return `${type}-${Date.now().toString(36)}${counter.toString(
    36
  )}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeBlock(
  type: BlockName,
  props: Record<string, unknown>
): Block {
  const merged = normalizeLists(type, { ...defaultsFor(type), ...props });
  return { type, props: { ...merged, id: newId(type) } };
}

function findIndex(page: PageData, id: unknown) {
  const i = page.content.findIndex((b) => b.props.id === id);
  if (i < 0)
    throw new OpError(
      `Não existe bloco com id "${String(id)}". Use os ids do resumo da página.`
    );
  return i;
}

function clampIndex(i: unknown, len: number) {
  const n = typeof i === "number" && Number.isFinite(i) ? Math.round(i) : len;
  return Math.max(0, Math.min(len, n));
}

/* ------------------------------------------------------------------ */
/* Operations                                                           */
/* ------------------------------------------------------------------ */

export type OpResult = { page: PageData; message: string; label: string };

export function insertBlock(
  page: PageData,
  input: { type: unknown; props?: unknown; index?: unknown; after_id?: unknown }
): OpResult {
  const type = assertType(input.type);
  const props = validateProps(type, input.props, true);
  const block = makeBlock(type, props);
  let index = clampIndex(input.index, page.content.length);
  if (typeof input.after_id === "string")
    index = findIndex(page, input.after_id) + 1;
  const content = [...page.content];
  content.splice(index, 0, block);
  return {
    page: { ...page, content },
    message: `Inserido ${type} com id ${block.props.id} na posição ${index}.`,
    label: `Adicionou ${blocks[type].label}`,
  };
}

export function updateBlock(
  page: PageData,
  input: { id: unknown; props?: unknown }
): OpResult {
  const i = findIndex(page, input.id);
  const current = page.content[i];
  const type = assertType(current.type);
  const props = validateProps(type, input.props, true);
  if (Object.keys(props).length === 0)
    throw new OpError("Nenhuma prop para alterar.");
  const content = [...page.content];
  content[i] = {
    ...current,
    props: {
      ...current.props,
      ...normalizeLists(type, props),
      id: current.props.id,
    },
  };
  return {
    page: { ...page, content },
    message: `Atualizado ${type} ${current.props.id}: ${Object.keys(props).join(
      ", "
    )}.`,
    label: `Editou ${blocks[type].label}`,
  };
}

export function removeBlock(page: PageData, input: { id: unknown }): OpResult {
  const i = findIndex(page, input.id);
  const removed = page.content[i];
  const content = page.content.filter((_, j) => j !== i);
  const label =
    (blocks as Record<string, { label: string }>)[removed.type]?.label ??
    removed.type;
  return {
    page: { ...page, content },
    message: `Removido ${removed.type} ${removed.props.id}.`,
    label: `Removeu ${label}`,
  };
}

export function moveBlock(
  page: PageData,
  input: { id: unknown; index: unknown }
): OpResult {
  const i = findIndex(page, input.id);
  const content = [...page.content];
  const [block] = content.splice(i, 1);
  const to = clampIndex(input.index, content.length);
  content.splice(to, 0, block);
  const label =
    (blocks as Record<string, { label: string }>)[block.type]?.label ??
    block.type;
  return {
    page: { ...page, content },
    message: `Movido ${block.type} para a posição ${to}.`,
    label: `Moveu ${label}`,
  };
}

export function updatePage(
  page: PageData,
  input: { props?: unknown }
): OpResult {
  const parsed = rootSchema.safeParse(input.props ?? {});
  if (!parsed.success)
    throw new OpError(`Configurações inválidas: ${formatZod(parsed.error)}.`);
  const keys = Object.keys(parsed.data);
  if (!keys.length) throw new OpError("Nenhuma configuração para alterar.");
  return {
    page: {
      ...page,
      root: { props: { ...rootDefaults, ...page.root.props, ...parsed.data } },
    },
    message: `Configurações da página atualizadas: ${keys.join(", ")}.`,
    label: "Ajustou o tema da página",
  };
}

export function replaceContent(
  page: PageData,
  input: { blocks?: unknown }
): OpResult {
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) {
    throw new OpError("Envie uma lista 'blocks' com pelo menos um bloco.");
  }
  if (input.blocks.length > 30)
    throw new OpError("No máximo 30 blocos por página.");
  const errors: string[] = [];
  const content: Block[] = [];
  input.blocks.forEach((raw, idx) => {
    try {
      const b = raw as { type?: unknown; props?: unknown };
      const type = assertType(b.type);
      content.push(makeBlock(type, validateProps(type, b.props, true)));
    } catch (e) {
      errors.push(`bloco ${idx}: ${(e as Error).message}`);
    }
  });
  if (errors.length) throw new OpError(errors.join(" | "));
  return {
    page: { ...page, content },
    message: `Página reconstruída com ${content.length} blocos.`,
    label: `Montou a página com ${content.length} seções`,
  };
}

export const operations = {
  insert_block: insertBlock,
  update_block: updateBlock,
  remove_block: removeBlock,
  move_block: moveBlock,
  update_page: updatePage,
  replace_content: replaceContent,
} as const;

export type OperationName = keyof typeof operations;

export function applyOperation(
  page: PageData,
  name: string,
  input: unknown
): OpResult {
  const op = (
    operations as Record<string, (p: PageData, i: never) => OpResult>
  )[name];
  if (!op) throw new OpError(`Ferramenta desconhecida: ${name}`);
  if (typeof input !== "object" || input === null)
    throw new OpError("Entrada da ferramenta deve ser um objeto.");
  return op(page, input as never);
}

/* ------------------------------------------------------------------ */
/* Page outline sent to the model after each change                      */
/* ------------------------------------------------------------------ */

function short(v: unknown, n = 70) {
  const s = String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function outline(page: PageData) {
  const root = { ...rootDefaults, ...page.root.props } as Record<
    string,
    unknown
  >;
  const lines = [
    `Tema: ${root.theme}, destaque ${root.accent}, tipografia ${
      root.font
    }. Título SEO: "${short(root.title)}"`,
    ...page.content.map((b, i) => {
      const p = b.props as Record<string, unknown>;
      const headline = p.title ?? p.text ?? p.brand ?? "";
      return `${i}. ${b.type} id=${p.id}${
        headline ? ` — "${short(headline)}"` : ""
      }`;
    }),
  ];
  return lines.join("\n");
}

export function emptyPage(title = ""): PageData {
  return { root: { props: { ...rootDefaults, title } }, content: [] };
}
