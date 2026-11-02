// Minimal OpenRouter client (OpenAI-compatible chat completions with streaming
// and tool calls). No SDK: one fetch, one SSE parser, easy to fake in tests.

export class OpenRouterError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolCall = { id: string; name: string; arguments: string };

export type ChatMessage =
  | {
      role: "system";
      content:
        | string
        | {
            type: "text";
            text: string;
            cache_control?: { type: "ephemeral" };
          }[];
    }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type Usage = { inputTokens: number; outputTokens: number };

export type ChatResult = {
  text: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  usage: Usage;
};

export const openRouterConfigured = () =>
  Boolean(process.env.OPENROUTER_API_KEY);

export async function streamChat(opts: {
  model: string;
  messages: ChatMessage[];
  tools: ToolSpec[];
  maxTokens?: number;
  signal?: AbortSignal;
  onText?: (delta: string) => void;
}): Promise<ChatResult> {
  const base = (
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
  ).replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      "http-referer": process.env.VITRINE_APP_URL || "http://localhost:3000",
      "x-title": "Vitrine",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      tools: opts.tools.map((t) => ({ type: "function", function: t })),
      tool_choice: "auto",
      stream: true,
      stream_options: { include_usage: true },
      usage: { include: true },
      max_tokens: opts.maxTokens ?? 32000,
    }),
  });

  if (!res.ok || !res.body) {
    let message = res.statusText;
    try {
      const j = await res.json();
      message = j?.error?.message || message;
    } catch {}
    throw new OpenRouterError(res.status, message);
  }

  let text = "";
  let finishReason: string | null = null;
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const calls = new Map<number, ToolCall>();

  const handle = (raw: string) => {
    const data = raw.trim();
    if (!data || data === "[DONE]") return;
    let chunk: any;
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    if (chunk.error)
      throw new OpenRouterError(
        Number(chunk.error.code) || 502,
        chunk.error.message || "Erro no provedor do modelo."
      );
    if (chunk.usage) {
      usage.inputTokens = chunk.usage.prompt_tokens ?? usage.inputTokens;
      usage.outputTokens = chunk.usage.completion_tokens ?? usage.outputTokens;
    }
    const choice = chunk.choices?.[0];
    if (!choice) return;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    const delta = choice.delta ?? {};
    if (typeof delta.content === "string" && delta.content) {
      text += delta.content;
      opts.onText?.(delta.content);
    }
    for (const tc of delta.tool_calls ?? []) {
      const i = tc.index ?? 0;
      const cur = calls.get(i) ?? { id: "", name: "", arguments: "" };
      if (tc.id) cur.id = tc.id;
      if (tc.function?.name) cur.name += tc.function.name;
      if (tc.function?.arguments) cur.arguments += tc.function.arguments;
      calls.set(i, cur);
    }
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, "");
      buffer = buffer.slice(nl + 1);
      if (line.startsWith("data:")) handle(line.slice(5));
    }
  }
  if (buffer.startsWith("data:")) handle(buffer.slice(5));

  const toolCalls = [...calls.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, c], i) => ({ ...c, id: c.id || `call_${i}` }))
    .filter((c) => c.name);
  return { text, toolCalls, finishReason, usage };
}
