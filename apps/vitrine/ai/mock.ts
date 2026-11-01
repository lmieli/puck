// Offline stand-in for the AI agent, enabled with VITRINE_AI_MOCK=1. It drives
// the same operations and events as the real agent so the editor pipeline can
// be tested end to end without an API key. It only understands a few phrases.

import type { AgentEvent, AgentInput } from "./agent.ts";
import { applyOperation, type PageData } from "./page-ops.ts";

export async function runMockAgent(
  input: AgentInput,
  emit: (e: AgentEvent) => void
) {
  let page: PageData = input.page;
  const actions: string[] = [];
  const text = input.instruction.toLowerCase();
  const quoted = input.instruction.match(/["“](.+?)["”]/)?.[1];

  const run = async (name: string, args: unknown) => {
    await new Promise((r) => setTimeout(r, 150));
    const r = applyOperation(page, name, args);
    page = r.page;
    actions.push(r.label);
    emit({ type: "action", label: r.label });
    emit({ type: "page", data: page });
  };

  emit({ type: "status", message: "Pensando… (modo de teste)" });

  if (input.mode === "build" || /crie|criar|monte|montar/.test(text)) {
    const name = quoted || input.siteName || "Novo site";
    await run("replace_content", {
      blocks: [
        { type: "Nav", props: { brand: name } },
        {
          type: "Hero",
          props: {
            title: `${name}.`,
            subtitle: "Página criada pelo modo de teste da IA.",
          },
        },
        {
          type: "Reveal",
          props: {
            text: "Este conteúdo é provisório e mostra o fluxo de criação.",
          },
        },
        { type: "Bento", props: {} },
        { type: "Cta", props: {} },
        { type: "Footer", props: { brand: name } },
      ],
    });
  }
  if (/escuro|dark/.test(text))
    await run("update_page", { props: { theme: "dark" } });
  if (/claro|light/.test(text))
    await run("update_page", { props: { theme: "light" } });
  if (quoted && input.selectedId && !/crie|criar|monte/.test(text)) {
    await run("update_block", {
      id: input.selectedId,
      props: { title: quoted },
    });
  }
  if (/depoimento/.test(text)) {
    await run("insert_block", {
      type: "Quotes",
      props: {},
      index: Math.max(0, page.content.length - 1),
    });
  }

  const summary = actions.length
    ? `Pronto (modo de teste): ${actions.join(", ").toLowerCase()}.`
    : "Modo de teste: não reconheci o pedido. Configure a chave da Anthropic para usar a IA de verdade.";
  for (const word of summary.split(" "))
    emit({ type: "text", delta: word + " " });
  emit({ type: "done", summary, data: page, actions });
  return page;
}
