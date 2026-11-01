// The AI editing agent. Claude edits the page through tools that map to the
// pure operations in page-ops.ts; each successful change is streamed to the
// editor so the person watches the page change live.

import Anthropic from "@anthropic-ai/sdk";
import { blockNames } from "../blocks/schema.ts";
import { applyOperation, OpError, outline, type PageData } from "./page-ops.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

export const AI_MODEL = process.env.VITRINE_AI_MODEL || "claude-opus-5-5";

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "text"; delta: string }
  | { type: "action"; label: string }
  | { type: "page"; data: PageData }
  | { type: "done"; summary: string; data: PageData; actions: string[] }
  | { type: "error"; message: string };

export type AgentInput = {
  instruction: string;
  page: PageData;
  selectedId?: string | null;
  history?: { role: "user" | "assistant"; text: string }[];
  siteName?: string;
  pagePath?: string;
  mode?: "edit" | "build";
};

const objectProps = { type: "object", additionalProperties: true } as const;

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "insert_block",
    description:
      "Insere um bloco novo. Informe index (posição, 0 = topo) ou after_id (insere logo depois desse bloco). props pode ser parcial: o que faltar usa o padrão do bloco.",
    eager_input_streaming: true,
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
    eager_input_streaming: true,
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
    eager_input_streaming: true,
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
    process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.VITRINE_AI_MOCK === "1"
  );
}

export async function runAgent(
  input: AgentInput,
  emit: (e: AgentEvent) => void,
  signal?: AbortSignal
) {
  if (process.env.VITRINE_AI_MOCK === "1") {
    const { runMockAgent } = await import("./mock.ts");
    return runMockAgent(input, emit);
  }

  const client = new Anthropic();
  let page = input.page;
  const actions: string[] = [];
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(input.history ?? [])
      .slice(-8)
      .map(
        (h) =>
          ({ role: h.role, content: h.text } as Anthropic.Beta.BetaMessageParam)
      ),
    { role: "user", content: buildUserMessage(input) },
  ];
  // History must start with a user turn.
  while (messages.length && messages[0].role !== "user") messages.shift();

  let summary = "";
  let jsonRetries = 0;

  for (let turn = 0; turn < 14; turn++) {
    emit({
      type: "status",
      message: turn === 0 ? "Pensando…" : "Continuando…",
    });
    const stream = client.beta.messages.stream(
      {
        model: AI_MODEL,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: input.mode === "build" ? "high" : "medium" },
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools,
        messages,
      },
      { signal }
    );
    stream.on("text", (delta) => emit({ type: "text", delta }));

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      if (
        err instanceof Anthropic.APIError ||
        signal?.aborted ||
        jsonRetries++ >= 2
      )
        throw err;
      continue; // a tool input could not be parsed; re-issue the turn
    }

    const text = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (text) summary = text;

    if (message.stop_reason === "refusal") {
      summary =
        "Não posso fazer essa alteração. Tente descrever o pedido de outra forma.";
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use"
    );
    if (toolUses.length === 0) break;
    if (message.stop_reason === "max_tokens") {
      throw new Error(
        "A resposta da IA foi cortada antes de terminar. Tente um pedido menor."
      );
    }

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of toolUses) {
      try {
        const r = applyOperation(page, use.name, use.input);
        page = r.page;
        actions.push(r.label);
        emit({ type: "action", label: r.label });
        emit({ type: "page", data: page });
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: `${r.message}\n\nResumo atualizado:\n${outline(page)}`,
        });
      } catch (e) {
        const msg =
          e instanceof OpError ? e.message : `Erro: ${(e as Error).message}`;
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: msg,
        });
      }
    }
    messages.push({ role: "user", content: results });
  }

  const finalSummary =
    summary ||
    (actions.length
      ? `Feito: ${actions.join(", ")}.`
      : "Nenhuma alteração foi necessária.");
  emit({ type: "done", summary: finalSummary, data: page, actions });
  return page;
}
