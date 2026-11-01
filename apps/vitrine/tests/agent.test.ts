// Runs the real agent (Anthropic SDK, streaming, tool loop) against a local
// fake of the Messages API, so the request shape and the loop are verified
// without network access or an API key.

import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { emptyPage, applyOperation } from "../ai/page-ops.ts";

type Captured = {
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
};

function sse(events: Record<string, unknown>[]) {
  return events
    .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)
    .join("");
}

function toolTurn(id: string, name: string, input: unknown) {
  const json = JSON.stringify(input);
  return sse([
    {
      type: "message_start",
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        content: [],
        stop_reason: null,
        usage: { input_tokens: 10, output_tokens: 1 },
      },
    },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Ajustando o título." },
    },
    { type: "content_block_stop", index: 0 },
    {
      type: "content_block_start",
      index: 1,
      content_block: { type: "tool_use", id, name, input: {} },
    },
    {
      type: "content_block_delta",
      index: 1,
      delta: { type: "input_json_delta", partial_json: json.slice(0, 10) },
    },
    {
      type: "content_block_delta",
      index: 1,
      delta: { type: "input_json_delta", partial_json: json.slice(10) },
    },
    { type: "content_block_stop", index: 1 },
    {
      type: "message_delta",
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 20 },
    },
    { type: "message_stop" },
  ]);
}

function finalTurn(text: string) {
  return sse([
    {
      type: "message_start",
      message: {
        id: "msg_2",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        content: [],
        stop_reason: null,
        usage: { input_tokens: 10, output_tokens: 1 },
      },
    },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    },
    { type: "content_block_stop", index: 0 },
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 5 },
    },
    { type: "message_stop" },
  ]);
}

test("agent streams tool calls, applies them and retries after a tool error", async () => {
  const page = applyOperation(emptyPage(), "insert_block", {
    type: "Hero",
    props: { title: "Antigo" },
  }).page;
  const heroId = page.content[0].props.id;
  const captured: Captured[] = [];
  const turns = [
    toolTurn("tu_1", "update_block", {
      id: heroId,
      props: { variant: "gigante" },
    }), // invalid → error result
    toolTurn("tu_2", "update_block", {
      id: heroId,
      props: { title: "Novo título." },
    }),
    finalTurn("Troquei o título da abertura."),
  ];

  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      captured.push({ headers: req.headers, body: JSON.parse(raw) });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(turns[captured.length - 1] ?? finalTurn("fim"));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.VITRINE_AI_MOCK;

  const { runAgent } = await import("../ai/agent.ts");
  const events: { type: string }[] = [];
  const result = await runAgent(
    { instruction: "Mude o título", page, selectedId: heroId },
    (e) => events.push(e)
  );
  server.close();

  assert.equal(result.content[0].props.title, "Novo título.");
  assert.equal(captured.length, 3, "three model turns");

  const first = captured[0].body;
  assert.equal(first.model, "claude-opus-5-5");
  assert.deepEqual(first.thinking, { type: "adaptive" });
  assert.equal(first.fallbacks, "default");
  assert.match(
    String(captured[0].headers["anthropic-beta"]),
    /server-side-fallback-2026-07-01/
  );
  assert.equal(
    (first.system as { cache_control?: unknown }[])[0].cache_control !==
      undefined,
    true
  );
  const tools = first.tools as {
    name: string;
    eager_input_streaming?: boolean;
  }[];
  assert.ok(
    tools.find((t) => t.name === "replace_content")?.eager_input_streaming
  );
  assert.match(JSON.stringify(first.messages), /Bloco selecionado/);

  // The invalid call came back to the model as an error tool_result.
  const secondMessages = captured[1].body.messages as {
    role: string;
    content: unknown;
  }[];
  const toolResult = JSON.stringify(secondMessages.at(-1));
  assert.match(toolResult, /"is_error":true/);
  assert.match(toolResult, /variant/);

  const types = events.map((e) => e.type);
  assert.ok(types.includes("text"));
  assert.ok(types.includes("page"));
  assert.equal(types.at(-1), "done");
  const done = events.at(-1) as unknown as {
    summary: string;
    actions: string[];
  };
  assert.equal(done.summary, "Troquei o título da abertura.");
  assert.deepEqual(done.actions, ["Editou Abertura"]);
});
