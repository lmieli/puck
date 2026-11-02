import {
  aiConfigured,
  runAgent,
  type AgentEvent,
  type AgentInput,
} from "@/ai/agent";
import type { PageData } from "@/ai/page-ops";
import { errorResponse, jsonBody } from "@/lib/api";
import { currentUser, HttpError } from "@/lib/auth";
import { balanceOf, chargeUsage, modelForSite } from "@/lib/credits";
import { OpenRouterError } from "@/ai/openrouter";
import { log, siteFor } from "@/lib/repo";

export const maxDuration = 300;

type Body = {
  slug: string;
  path: string;
  instruction: string;
  data: PageData;
  selectedId?: string | null;
  history?: AgentInput["history"];
  mode?: "edit" | "build";
};

function friendly(e: unknown) {
  if (e instanceof OpenRouterError) {
    if (e.status === 401)
      return "A chave da OpenRouter é inválida. Confira OPENROUTER_API_KEY.";
    if (e.status === 402)
      return "O saldo da conta da OpenRouter acabou. Avise a agência.";
    if (e.status === 429)
      return "Muitos pedidos à IA agora. Espere alguns segundos e tente de novo.";
    if (e.status === 400 || e.status === 404)
      return `O modelo configurado para este site não respondeu (${e.message}). Avise a agência para trocá-lo.`;
    return `A IA está indisponível no momento (${e.status}). Tente de novo.`;
  }
  return (e as Error)?.message || "Erro inesperado na IA.";
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Faça login para continuar.");
    const body = await jsonBody<Body>(req);
    const { site } = siteFor(user, body.slug, "editor");
    if (!aiConfigured()) {
      throw new HttpError(
        503,
        "A edição por IA ainda não foi ativada neste servidor. Defina OPENROUTER_API_KEY no ambiente e reinicie."
      );
    }
    if (balanceOf(site.id) <= 0)
      throw new HttpError(
        402,
        "Os créditos de IA deste site acabaram. Peça mais créditos à agência."
      );
    const model = modelForSite(site.id);
    const instruction = String(body.instruction || "")
      .trim()
      .slice(0, 4000);
    if (!instruction)
      throw new HttpError(400, "Escreva o que você quer mudar.");
    if (!body.data || !Array.isArray(body.data.content))
      throw new HttpError(400, "Página inválida.");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (e: AgentEvent) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        try {
          await runAgent(
            {
              instruction,
              page: body.data,
              selectedId: body.selectedId,
              history: (body.history ?? [])
                .filter((h) => h && typeof h.text === "string")
                .slice(-8),
              siteName: site.name,
              pagePath: body.path,
              mode: body.mode,
              credits: {
                model: model.id,
                remaining: () => balanceOf(site.id),
                charge: (u) =>
                  chargeUsage(
                    site.id,
                    user.id,
                    model.id,
                    model.price,
                    u.inputTokens,
                    u.outputTokens,
                    instruction.slice(0, 80)
                  ),
              },
            },
            (e) => {
              send(e);
              if (e.type === "done" && e.actions.length) {
                log(
                  site.id,
                  user.id,
                  "ai",
                  `IA em ${body.path}: ${instruction.slice(0, 120)}`
                );
              }
            },
            req.signal
          );
        } catch (e) {
          send({ type: "error", message: friendly(e) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
