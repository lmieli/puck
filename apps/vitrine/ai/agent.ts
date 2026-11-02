// The AI editing agent. The model (any model on OpenRouter) edits the page
// through tools that map to the pure operations in page-ops.ts; each
// successful change is streamed to the editor so the person watches the page
// change live. Every model call is charged in credits from its real token use.

import { blockNames } from "../blocks/schema.ts";
import { applyOperation, OpError, outline, type PageData } from "./page-ops.ts";
import {
  streamChat,
  type ChatMessage,
  type ToolSpec,
  type Usage,
} from "./openrouter.ts";
import { FALLBACK_MODEL_ID } from "./pricing.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "text"; delta: string }
  | { type: "action"; label: string }
  | { type: "page"; data: PageData }
  | { type: "credits"; balance: number; cost: number }
  | { type: "done"; summary: string; data: PageData; actions: string[] }
  | { type: "error"; message: string };

/** How the agent bills a site; implemented by the server (lib/credits.ts). */
export type CreditMeter = {
  model: string;
  remaining: () => number;
  charge: (usage: Usage) => { cost: number; balance: number };
};

export type AgentInput = {
  instruction: string;
  page: PageData;
  selectedId?: string | null;
  history?: { role: "user" | "assistant"; text: string }[];
  siteName?: string;
  pagePath?: string;
  mode?: "edit" | "build";
  credits?: CreditMeter;
};

const objectProps = { type: "object", additionalProperties: true } as const;

const toolDefs = [
  {
    name: "insert_block",
    description:
      "Insere um bloco novo. Informe index (posição, 0 = topo) ou after_id (insere logo depois desse bloco). props pode ser parcial: o que faltar usa o padrão do bloco.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: blockNames },
        props: objectProps,
        index: { type: "integer" },
        after_id: { type: "string" },
      },
      required: ["type", "props"],
    },
  },
  {
    name: "update_block",
    description:
      "Altera props de um bloco existente. Envie só as props que mudam; listas são substituídas inteiras.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, props: objectProps },
      required: ["id", "props"],
    },
  },
  {
    name: "remove_block",
    description: "Remove um bloco da página.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "move_block",
    description: "Move um bloco para outra posição (0 = topo).",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, index: { type: "integer" } },
      required: ["id", "index"],
    },
  },
  {
    name: "update_page",
    description:
      "Altera as configurações da página: title, description, theme (light|dark), accent (#rrggbb), font (clean|editorial|geometric).",
    input_schema: {
      type: "object",
      properties: { props: objectProps },
      required: ["props"],
    },
  },
  {
    name: "replace_content",
    description:
      "Substitui todos os blocos da página por uma lista nova. Use para criar uma página do zero ou refazer a página inteira.",
    input_schema: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: blockNames },
              props: objectProps,
            },
            required: ["type", "props"],
          },
        },
      },
      required: ["blocks"],
    },
  },
];

const tools: ToolSpec[] = toolDefs.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.input_schema as Record<string, unknown>,
}));

function buildUserMessage(input: AgentInput) {
  const selected = input.selectedId
    ? input.page.content.find((b) => b.props.id === input.selectedId)
    : null;
  return [
    input.siteName
      ? `Site: ${input.siteName}${
          input.pagePath ? ` — página ${input.pagePath}` : ""
        }`
      : "",
    `## Resumo da página\n${outline(input.page)}`,
    selected
      ? `## Bloco selecionado\n${JSON.stringify(selected)}`
      : "## Bloco selecionado\nNenhum.",
    `## Página completa (JSON)\n${JSON.stringify(input.page.content)}`,
    `## Pedido\n${input.instruction}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function aiConfigured() {
  return Boolean(
    process.env.OPENROUTER_API_KEY || process.env.VITRINE_AI_MOCK === "1"
  );
}

const MOCK_USAGE: Usage = { inputTokens: 2400, outputTokens: 600 };

export async function runAgent(
  input: AgentInput,
  emit: (e: AgentEvent) => void,
  signal?: AbortSignal
) {
  if (process.env.VITRINE_AI_MOCK === "1") {
    const { runMockAgent } = await import("./mock.ts");
    const out = await runMockAgent(input, emit);
    if (input.credits) {
      const r = input.credits.charge(MOCK_USAGE);
      emit({ type: "credits", balance: r.balance, cost: r.cost });
    }
    return out;
  }

  const model = input.credits?.model ?? FALLBACK_MODEL_ID;
  const cacheable = model.startsWith("anthropic/");
  let page = input.page;
  const actions: string[] = [];
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: cacheable
        ? [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ]
        : SYSTEM_PROMPT,
    },
    ...(input.history ?? [])
      .slice(-8)
      .map((h) => ({ role: h.role, content: h.text } as ChatMessage)),
    { role: "user", content: buildUserMessage(input) },
  ];
  // After the system prompt, history must start with a user turn.
  while (messages.length > 1 && messages[1].role !== "user")
    messages.splice(1, 1);

  let summary = "";
  let exhausted = false;

  for (let turn = 0; turn < 14; turn++) {
    if (input.credits && input.credits.remaining() <= 0) {
      exhausted = true;
      break;
    }
    emit({
      type: "status",
      message: turn === 0 ? "Pensando…" : "Continuando…",
    });
    const result = await streamChat({
      model,
      messages,
      tools,
      maxTokens: 32000,
      signal,
      onText: (delta) => emit({ type: "text", delta }),
    });
    if (input.credits) {
      const r = input.credits.charge(result.usage);
      emit({ type: "credits", balance: r.balance, cost: r.cost });
    }

    const text = result.text.trim();
    if (text) summary = text;

    if (result.finishReason === "content_filter") {
      summary =
        "Não posso fazer essa alteração. Tente descrever o pedido de outra forma.";
      break;
    }
    if (result.toolCalls.length === 0) break;
    if (result.finishReason === "length") {
      throw new Error(
        "A resposta da IA foi cortada antes de terminar. Tente um pedido menor."
      );
    }

    messages.push({
      role: "assistant",
      content: result.text || null,
      tool_calls: result.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.arguments },
      })),
    });
    for (const use of result.toolCalls) {
      let content: string;
      try {
        let args: unknown;
        try {
          args = JSON.parse(use.arguments || "{}");
        } catch {
          throw new OpError(
            "Os argumentos da ferramenta não são um JSON válido. Envie de novo."
          );
        }
        const r = applyOperation(page, use.name, args);
        page = r.page;
        actions.push(r.label);
        emit({ type: "action", label: r.label });
        emit({ type: "page", data: page });
        content = `${r.message}\n\nResumo atualizado:\n${outline(page)}`;
      } catch (e) {
        content =
          e instanceof OpError ? e.message : `Erro: ${(e as Error).message}`;
      }
      messages.push({ role: "tool", tool_call_id: use.id, content });
    }
  }

  let finalSummary =
    summary ||
    (actions.length
      ? `Feito: ${actions.join(", ")}.`
      : "Nenhuma alteração foi necessária.");
  if (exhausted)
    finalSummary = `${
      summary ? summary + "\n\n" : ""
    }Os créditos deste site acabaram${
      actions.length
        ? " no meio do pedido; o que já foi feito ficou no rascunho"
        : ""
    }. Peça mais créditos à agência.`;
  emit({ type: "done", summary: finalSummary, data: page, actions });
  return page;
}
