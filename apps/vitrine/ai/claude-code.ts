// Claude Code engine: the same editing agent as agent.ts, but the model loop is
// the Claude Code agent (Claude Agent SDK) running on this server. It talks to
// OpenRouter through its Anthropic-compatible API, so the same OPENROUTER_API_KEY
// and the per-site model keep working. Differences from the default engine:
//
//  - The art direction and the agency's own guidance live in project skills
//    (ai/claude/.claude/skills/*/SKILL.md), editable without touching code.
//  - The six page tools are exposed to Claude Code as an in-process MCP server;
//    they run the very same validated operations (page-ops.ts).
//  - Nothing else is reachable: no shell, no files, no web, no other MCP.
//
// Enable with VITRINE_AI_ENGINE=claude-code. Needs a long-running server (it
// starts the Claude Code process), so it does not work on serverless hosts.

import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { z } from "zod/v4";
import {
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { blockNames } from "../blocks/schema.ts";
import type { AgentEvent, AgentInput, CreditMeter } from "./agent.ts";
import { applyOperation, OpError, outline, type PageData } from "./page-ops.ts";
import type { Usage } from "./openrouter.ts";
import { FALLBACK_MODEL_ID } from "./pricing.ts";
import { SYSTEM_PROMPT_SKILLS } from "./prompt.ts";

/** Skills the model may use. Anything else found on disk is hidden from it. */
export const SKILL_NAMES = ["direcao-de-arte", "sobre-a-agencia"];

const SERVER_NAME = "site";
const MAX_TURNS = 14;

/* ------------------------------------------------------------------ */
/* Where Claude Code runs                                                */
/* ------------------------------------------------------------------ */

/** Folder whose .claude/skills the agent reads. Override with VITRINE_SKILLS_DIR. */
export function skillsCwd() {
  const dir =
    process.env.VITRINE_SKILLS_DIR ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), "ai", "claude");
  return dir;
}

/** Empty HOME so the host's own Claude Code settings, skills and memory never leak in. */
function cleanHome() {
  const dir = path.join(os.tmpdir(), "vitrine-claude-home");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** OpenRouter root for the Anthropic-compatible API (no /v1: the CLI adds it). */
export function anthropicBaseUrl() {
  const base =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  return base.replace(/\/+$/, "").replace(/\/v1$/, "");
}

const PASS_THROUGH = [
  "PATH",
  "LANG",
  "TZ",
  "TMPDIR",
  // Corporate proxies / custom CAs, if the server needs them to reach the internet.
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "NO_PROXY",
  "https_proxy",
  "http_proxy",
  "no_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
];

/**
 * The only environment the Claude Code process gets: no secrets other than the
 * OpenRouter key (sent as the token), and nothing that could point it at
 * another account or provider.
 */
export function buildEnv(
  source: Record<string, string | undefined> = process.env,
  home = cleanHome()
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const k of PASS_THROUGH) if (source[k]) env[k] = source[k] as string;
  const small = source.VITRINE_AI_SMALL_MODEL || "anthropic/claude-haiku-5.5";
  return {
    ...env,
    HOME: home,
    ANTHROPIC_BASE_URL: anthropicBaseUrl(),
    ANTHROPIC_AUTH_TOKEN: source.OPENROUTER_API_KEY ?? "",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_DEFAULT_HAIKU_MODEL: small,
    ANTHROPIC_SMALL_FAST_MODEL: small,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_AUTOUPDATER: "1",
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  };
}

/* ------------------------------------------------------------------ */
/* Billing                                                               */
/* ------------------------------------------------------------------ */

export type RawUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/**
 * Tokens as the price table understands them. Cache writes cost about 1.25x
 * and cache reads about 0.1x of a normal input token, so they are weighted
 * instead of counted whole (which would overcharge every turn after the first).
 */
export function billableUsage(u: RawUsage): Usage {
  const n = (v: number | null | undefined) => Math.max(0, Number(v) || 0);
  return {
    inputTokens: Math.round(
      n(u.input_tokens) +
        n(u.cache_creation_input_tokens) * 1.25 +
        n(u.cache_read_input_tokens) * 0.1
    ),
    outputTokens: n(u.output_tokens),
  };
}

/**
 * Charges each model response once. Claude Code reports one message per content
 * block, all sharing the response id and repeating its usage, so usage is kept
 * per id (largest value wins) and charged when the next response starts or the
 * run ends.
 */
export class UsageBiller {
  private current: { id: string; usage: RawUsage } | null = null;
  private meter: CreditMeter | undefined;
  private emit: (e: AgentEvent) => void;
  exhausted = false;

  constructor(meter: CreditMeter | undefined, emit: (e: AgentEvent) => void) {
    this.meter = meter;
    this.emit = emit;
  }

  /** Record usage from a message; returns true when the credits just ran out. */
  seen(id: string, usage: RawUsage | undefined): boolean {
    if (!usage) return false;
    if (this.current && this.current.id !== id) this.flush();
    if (!this.current) this.current = { id, usage: { ...usage } };
    else {
      const c = this.current.usage;
      for (const k of Object.keys(usage) as (keyof RawUsage)[])
        c[k] = Math.max(Number(c[k]) || 0, Number(usage[k]) || 0);
    }
    return this.exhausted;
  }

  flush() {
    const cur = this.current;
    this.current = null;
    if (!cur || !this.meter) return;
    const billable = billableUsage(cur.usage);
    if (billable.inputTokens + billable.outputTokens === 0) return;
    const r = this.meter.charge(billable);
    this.emit({ type: "credits", balance: r.balance, cost: r.cost });
    if (this.meter.remaining() <= 0) this.exhausted = true;
  }
}

/* ------------------------------------------------------------------ */
/* Page tools                                                            */
/* ------------------------------------------------------------------ */

const props = z.record(z.string(), z.unknown());
const blockType = z.enum(blockNames as [string, ...string[]]);

type Mutable = { page: PageData; actions: string[] };

/** The six page tools as an in-process MCP server over a mutable page. */
export function createSiteServer(
  state: Mutable,
  emit: (e: AgentEvent) => void
) {
  const run = (name: string) => async (args: Record<string, unknown>) => {
    try {
      const r = applyOperation(state.page, name, args);
      state.page = r.page;
      state.actions.push(r.label);
      emit({ type: "action", label: r.label });
      emit({ type: "page", data: state.page });
      return {
        content: [
          {
            type: "text" as const,
            text: `${r.message}\n\nResumo atualizado:\n${outline(state.page)}`,
          },
        ],
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text:
              e instanceof OpError
                ? e.message
                : `Erro: ${(e as Error).message}`,
          },
        ],
      };
    }
  };

  return createSdkMcpServer({
    name: SERVER_NAME,
    version: "1.0.0",
    tools: [
      tool(
        "insert_block",
        "Insere um bloco novo. Informe index (posição, 0 = topo) ou after_id (insere logo depois desse bloco). props pode ser parcial: o que faltar usa o padrão do bloco.",
        {
          type: blockType,
          props,
          index: z.number().int().optional(),
          after_id: z.string().optional(),
        },
        run("insert_block")
      ),
      tool(
        "update_block",
        "Altera props de um bloco existente. Envie só as props que mudam; listas são substituídas inteiras.",
        { id: z.string(), props },
        run("update_block")
      ),
      tool(
        "remove_block",
        "Remove um bloco da página.",
        { id: z.string() },
        run("remove_block")
      ),
      tool(
        "move_block",
        "Move um bloco para outra posição (0 = topo).",
        { id: z.string(), index: z.number().int() },
        run("move_block")
      ),
      tool(
        "update_page",
        "Altera as configurações da página: title, description, theme (light|dark), accent (#rrggbb), font (clean|editorial|geometric).",
        { props },
        run("update_page")
      ),
      tool(
        "replace_content",
        "Substitui todos os blocos da página por uma lista nova. Use para criar uma página do zero ou refazer a página inteira.",
        { blocks: z.array(z.object({ type: blockType, props })) },
        run("replace_content")
      ),
    ],
  });
}

export const TOOL_NAMES = [
  "insert_block",
  "update_block",
  "remove_block",
  "move_block",
  "update_page",
  "replace_content",
].map((n) => `mcp__${SERVER_NAME}__${n}`);

/* ------------------------------------------------------------------ */
/* Prompt                                                                */
/* ------------------------------------------------------------------ */

export function buildPrompt(input: AgentInput) {
  const selected = input.selectedId
    ? input.page.content.find((b) => b.props.id === input.selectedId)
    : null;
  const history = (input.history ?? [])
    .slice(-8)
    .map((h) => `${h.role === "user" ? "Pessoa" : "Você"}: ${h.text}`)
    .join("\n");
  return [
    input.siteName
      ? `Site: ${input.siteName}${
          input.pagePath ? ` — página ${input.pagePath}` : ""
        }`
      : "",
    history ? `## Conversa até aqui\n${history}` : "",
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

/* ------------------------------------------------------------------ */
/* Agent                                                                 */
/* ------------------------------------------------------------------ */

export async function runClaudeCodeAgent(
  input: AgentInput,
  emit: (e: AgentEvent) => void,
  signal?: AbortSignal
) {
  const model = input.credits?.model ?? FALLBACK_MODEL_ID;
  const state: Mutable = { page: input.page, actions: [] };
  const biller = new UsageBiller(input.credits, emit);
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  signal?.addEventListener("abort", onAbort);

  let summary = "";
  let failure = "";
  let exhausted = false;

  try {
    if (input.credits && input.credits.remaining() <= 0) {
      exhausted = true;
    } else {
      emit({ type: "status", message: "Pensando…" });
      const stream = query({
        prompt: buildPrompt(input),
        options: {
          model,
          cwd: skillsCwd(),
          systemPrompt: SYSTEM_PROMPT_SKILLS,
          settingSources: ["project"],
          skills: SKILL_NAMES,
          mcpServers: { [SERVER_NAME]: createSiteServer(state, emit) },
          strictMcpConfig: true,
          tools: ["Skill"],
          allowedTools: ["Skill", ...TOOL_NAMES],
          permissionMode: "dontAsk",
          maxTurns: MAX_TURNS,
          persistSession: false,
          includePartialMessages: true,
          abortController: abort,
          env: buildEnv(),
        },
      });

      for await (const m of stream) {
        if (m.type === "stream_event") {
          const ev = m.event as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (
            ev.type === "content_block_delta" &&
            ev.delta?.type === "text_delta" &&
            ev.delta.text
          )
            emit({ type: "text", delta: ev.delta.text });
        } else if (m.type === "assistant") {
          if (biller.seen(m.message.id, m.message.usage as RawUsage)) {
            exhausted = true;
            abort.abort();
          }
          emit({ type: "status", message: "Continuando…" });
        } else if (m.type === "result") {
          biller.flush();
          if (biller.exhausted) exhausted = true;
          if (m.subtype === "success" && !m.is_error)
            summary = (m.result ?? "").trim();
          else if (m.subtype === "success") failure = m.result || "";
          else failure = "A IA não conseguiu concluir o pedido.";
        }
      }
    }
  } catch (e) {
    if (!abort.signal.aborted) failure = (e as Error).message;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    biller.flush();
    if (biller.exhausted) exhausted = true;
  }

  if (failure && !state.actions.length && !exhausted) throw new Error(failure);

  const actions = state.actions;
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
  emit({ type: "done", summary: finalSummary, data: state.page, actions });
  return state.page;
}
