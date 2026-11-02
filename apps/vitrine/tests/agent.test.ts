// Runs the real agent (OpenRouter client, streaming, tool loop, credit meter)
// against a local fake of the OpenRouter chat-completions API, so the request
// shape, the loop and the billing are verified without network or an API key.

import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { emptyPage, applyOperation } from "../ai/page-ops.ts";
import { costCredits } from "../ai/pricing.ts";

type Captured = {
  headers: IncomingMessage["headers"];
  body: Record<string, any>;
};

const sse = (chunks: unknown[]) =>
  chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") +
  "data: [DONE]\n\n";

function toolTurn(
  id: string,
  name: string,
  input: unknown,
  usage = { prompt_tokens: 1000, completion_tokens: 200 }
) {
  const json = JSON.stringify(input);
  return sse([
    { choices: [{ delta: { content: "Ajustando o título." } }] },
    {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id,
                type: "function",
                function: { name, arguments: json.slice(0, 10) },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: json.slice(10) } }],
          },
        },
      ],
    },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    { choices: [], usage },
  ]);
}

const finalTurn = (
  text: string,
  usage = { prompt_tokens: 1500, completion_tokens: 50 }
) =>
  sse([
    { choices: [{ delta: { content: text } }] },
    { choices: [{ delta: {}, finish_reason: "stop" }] },
    { choices: [], usage },
  ]);

async function fakeServer(turns: string[], captured: Captured[]) {
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
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${port}/api/v1`;
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.VITRINE_AI_MOCK;
  return server;
}

function heroPage() {
  const page = applyOperation(emptyPage(), "insert_block", {
    type: "Hero",
    props: { title: "Antigo" },
  }).page;
  return { page, heroId: page.content[0].props.id as string };
}

test("costCredits prices input and output separately and rounds up", () => {
  const price = { inPerMtok: 3000, outPerMtok: 15000 };
  assert.equal(costCredits(price, 0, 0), 0);
  assert.equal(costCredits(price, 1, 1), 1, "any use costs at least 1");
  // 1000 in * 3000/1M = 3 ; 200 out * 15000/1M = 3 -> 6
  assert.equal(costCredits(price, 1000, 200), 6);
  assert.equal(costCredits(price, 1_000_000, 1_000_000), 18000);
  assert.ok(costCredits({ inPerMtok: 150, outPerMtok: 600 }, 1000, 200) < 6);
});

test("agent streams tool calls, bills every turn and recovers from a tool error", async () => {
  const { page, heroId } = heroPage();
  const captured: Captured[] = [];
  const server = await fakeServer(
    [
      toolTurn("c1", "update_block", {
        id: heroId,
        props: { variant: "gigante" },
      }), // invalid
      toolTurn("c2", "update_block", {
        id: heroId,
        props: { title: "Novo título." },
      }),
      finalTurn("Troquei o título da abertura."),
    ],
    captured
  );

  const { runAgent } = await import("../ai/agent.ts");
  const price = { inPerMtok: 3000, outPerMtok: 15000 };
  let balance = 1000;
  const charges: { in: number; out: number; cost: number }[] = [];
  const events: { type: string }[] = [];
  const result = await runAgent(
    {
      instruction: "Mude o título",
      page,
      selectedId: heroId,
      credits: {
        model: "anthropic/claude-sonnet-4.5",
        remaining: () => balance,
        charge: (u) => {
          const cost = costCredits(price, u.inputTokens, u.outputTokens);
          balance -= cost;
          charges.push({ in: u.inputTokens, out: u.outputTokens, cost });
          return { cost, balance };
        },
      },
    },
    (e) => events.push(e)
  );
  server.closeAllConnections();
  server.close();

  assert.equal(result.content[0].props.title, "Novo título.");
  assert.equal(captured.length, 3, "three model turns");

  const first = captured[0];
  assert.equal(first.body.model, "anthropic/claude-sonnet-4.5");
  assert.equal(first.headers.authorization, "Bearer test-key");
  assert.equal(first.body.stream, true);
  assert.deepEqual(first.body.stream_options, { include_usage: true });
  assert.ok(
    Array.isArray(first.body.messages[0].content),
    "anthropic models get a cacheable system prompt"
  );
  assert.ok(first.body.messages[0].content[0].cache_control);
  assert.ok(
    first.body.tools.find((t: any) => t.function.name === "replace_content")
  );
  assert.match(JSON.stringify(first.body.messages), /Bloco selecionado/);

  // The invalid call came back to the model as a tool message with the reason.
  const second = captured[1].body.messages.at(-1);
  assert.equal(second.role, "tool");
  assert.equal(second.tool_call_id, "c1");
  assert.match(second.content, /variant/);

  // Each turn is billed from the tokens the provider reported.
  assert.equal(charges.length, 3);
  assert.deepEqual(charges[0], { in: 1000, out: 200, cost: 6 });
  assert.equal(balance, 1000 - charges.reduce((s, c) => s + c.cost, 0));

  const types = events.map((e) => e.type);
  assert.ok(types.includes("text") && types.includes("page"));
  assert.equal(types.filter((t) => t === "credits").length, 3);
  assert.equal(types.at(-1), "done");
  const done = events.at(-1) as unknown as {
    summary: string;
    actions: string[];
  };
  assert.equal(done.summary, "Troquei o título da abertura.");
  assert.deepEqual(done.actions, ["Editou Abertura"]);
});

test("agent stops when credits run out and keeps what was already applied", async () => {
  const { page, heroId } = heroPage();
  const captured: Captured[] = [];
  const server = await fakeServer(
    [
      toolTurn(
        "c1",
        "update_block",
        { id: heroId, props: { title: "Primeiro." } },
        { prompt_tokens: 1000, completion_tokens: 0 }
      ),
      toolTurn("c2", "update_block", {
        id: heroId,
        props: { title: "Segundo." },
      }),
    ],
    captured
  );
  const { runAgent } = await import("../ai/agent.ts");
  let balance = 3; // the first turn costs 3 and empties the balance
  const events: any[] = [];
  const result = await runAgent(
    {
      instruction: "Mude o título",
      page,
      credits: {
        model: "openai/gpt-4o-mini",
        remaining: () => balance,
        charge: (u) => {
          const cost = costCredits(
            { inPerMtok: 3000, outPerMtok: 0 },
            u.inputTokens,
            u.outputTokens
          );
          balance -= cost;
          return { cost, balance };
        },
      },
    },
    (e) => events.push(e)
  );
  server.closeAllConnections();
  server.close();

  assert.equal(captured.length, 1, "no second model call without credits");
  assert.equal(captured[0].body.model, "openai/gpt-4o-mini");
  assert.equal(
    captured[0].body.messages[0].content,
    captured[0].body.messages[0].content as string,
    "non-anthropic models get a plain system prompt"
  );
  assert.equal(typeof captured[0].body.messages[0].content, "string");
  assert.equal(result.content[0].props.title, "Primeiro.");
  assert.match(events.at(-1).summary, /créditos deste site acabaram/);
});
