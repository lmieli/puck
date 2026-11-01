import Anthropic from "@anthropic-ai/sdk";
import {
  aiConfigured,
  runAgent,
  type AgentEvent,
  type AgentInput,
} from "@/ai/agent";
import type { PageData } from "@/ai/page-ops";
import { errorResponse, jsonBody } from "@/lib/api";
import { currentUser, HttpError } from "@/lib/auth";
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
  if (e instanceof Anthropic.AuthenticationError)
    return "A chave da Anthropic é inválida. Confira ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.RateLimitError)
    return "Muitos pedidos à IA agora. Espere alguns segundos e tente de novo.";
  if (e instanceof Anthropic.APIError)
    return `A IA está indisponível no momento (${
      e.status ?? "erro"
    }). Tente de novo.`;
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
        "A edição por IA ainda não foi ativada neste servidor. Defina ANTHROPIC_API_KEY no ambiente e reinicie."
      );
    }
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
