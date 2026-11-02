// Claude Code engine: the parts that need no network or Claude Code process.
// Billing, the process environment, the prompt and the project skills.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  anthropicBaseUrl,
  billableUsage,
  buildEnv,
  buildPrompt,
  skillsCwd,
  SKILL_NAMES,
  TOOL_NAMES,
  UsageBiller,
} from "../ai/claude-code.ts";
import type { AgentEvent, CreditMeter } from "../ai/agent.ts";
import { emptyPage } from "../ai/page-ops.ts";
import { costCredits } from "../ai/pricing.ts";
import {
  ART_DIRECTION,
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_SKILLS,
} from "../ai/prompt.ts";

function meter(start: number) {
  const price = { inPerMtok: 2000, outPerMtok: 10000 };
  const m = {
    balance: start,
    charges: [] as { in: number; out: number; cost: number }[],
  };
  const credits: CreditMeter = {
    model: "anthropic/claude-sonnet-5.5",
    remaining: () => m.balance,
    charge: (u) => {
      const cost = costCredits(price, u.inputTokens, u.outputTokens);
      m.balance -= cost;
      m.charges.push({ in: u.inputTokens, out: u.outputTokens, cost });
      return { cost, balance: m.balance };
    },
  };
  return { m, credits };
}

test("cache reads and writes are weighted, not counted as full input", () => {
  assert.deepEqual(
    billableUsage({
      input_tokens: 10,
      output_tokens: 50,
      cache_creation_input_tokens: 1000,
      cache_read_input_tokens: 10000,
    }),
    { inputTokens: 10 + 1250 + 1000, outputTokens: 50 }
  );
  assert.deepEqual(billableUsage({}), { inputTokens: 0, outputTokens: 0 });
  assert.deepEqual(billableUsage({ input_tokens: -5, output_tokens: NaN }), {
    inputTokens: 0,
    outputTokens: 0,
  });
});

test("a response split into several messages is charged once, with its final usage", () => {
  const { m, credits } = meter(1000);
  const events: AgentEvent[] = [];
  const biller = new UsageBiller(credits, (e) => events.push(e));

  // Three content blocks of the same response repeat the usage, output growing.
  biller.seen("msg_1", { input_tokens: 100, output_tokens: 10 });
  biller.seen("msg_1", { input_tokens: 100, output_tokens: 40 });
  biller.seen("msg_1", { input_tokens: 100, output_tokens: 40 });
  assert.equal(m.charges.length, 0, "not charged until the response ends");

  // A new response id closes the previous one.
  biller.seen("msg_2", { input_tokens: 200, output_tokens: 5 });
  assert.equal(m.charges.length, 1);
  assert.deepEqual(
    { in: m.charges[0].in, out: m.charges[0].out },
    { in: 100, out: 40 }
  );

  biller.flush();
  assert.equal(m.charges.length, 2);
  assert.deepEqual(
    { in: m.charges[1].in, out: m.charges[1].out },
    { in: 200, out: 5 }
  );
  biller.flush(); // nothing pending
  assert.equal(m.charges.length, 2);
  assert.equal(events.filter((e) => e.type === "credits").length, 2);
  assert.equal(biller.exhausted, false);
});

test("the biller flags exhaustion as soon as a charge empties the balance", () => {
  const { credits } = meter(3);
  const biller = new UsageBiller(credits, () => {});
  assert.equal(
    biller.seen("a", { input_tokens: 1000, output_tokens: 200 }),
    false
  );
  // 1000*2000/1M + 200*10000/1M = 4 credits > balance 3
  assert.equal(
    biller.seen("b", { input_tokens: 1, output_tokens: 1 }),
    true,
    "reported on the call that follows the charge"
  );
  assert.equal(biller.exhausted, true);
});

test("without a meter nothing is charged and nothing breaks", () => {
  const biller = new UsageBiller(undefined, () => assert.fail("no events"));
  biller.seen("a", { input_tokens: 10, output_tokens: 10 });
  biller.flush();
  assert.equal(biller.exhausted, false);
});

test("the Claude Code process gets only what it needs", () => {
  const env = buildEnv(
    {
      PATH: "/usr/bin",
      OPENROUTER_API_KEY: "sk-or-test",
      ANTHROPIC_API_KEY: "sk-ant-should-not-leak",
      AWS_SECRET_ACCESS_KEY: "secret",
      RESEND_API_KEY: "secret",
      VERCEL_TOKEN: "secret",
      HTTPS_PROXY: "http://proxy:3128",
    },
    "/tmp/clean-home"
  );
  assert.equal(env.ANTHROPIC_AUTH_TOKEN, "sk-or-test");
  assert.equal(env.ANTHROPIC_API_KEY, "", "never an Anthropic key");
  assert.equal(env.ANTHROPIC_BASE_URL, "https://openrouter.ai/api");
  assert.equal(env.HOME, "/tmp/clean-home");
  assert.equal(env.HTTPS_PROXY, "http://proxy:3128");
  for (const secret of [
    "AWS_SECRET_ACCESS_KEY",
    "RESEND_API_KEY",
    "VERCEL_TOKEN",
  ])
    assert.equal(secret in env, false, `${secret} must not reach the agent`);
  assert.equal(env.OPENROUTER_API_KEY, undefined);
});

test("the OpenRouter base URL is turned into the Anthropic-compatible root", () => {
  const prev = process.env.OPENROUTER_BASE_URL;
  try {
    process.env.OPENROUTER_BASE_URL = "http://localhost:9999/api/v1/";
    assert.equal(anthropicBaseUrl(), "http://localhost:9999/api");
    delete process.env.OPENROUTER_BASE_URL;
    assert.equal(anthropicBaseUrl(), "https://openrouter.ai/api");
  } finally {
    if (prev === undefined) delete process.env.OPENROUTER_BASE_URL;
    else process.env.OPENROUTER_BASE_URL = prev;
  }
});

test("the prompt carries the page, the selection, the history and the request", () => {
  const page = emptyPage("Teste");
  page.content.push({
    type: "Hero",
    props: { id: "Hero-1", title: "Olá" },
  } as never);
  const p = buildPrompt({
    instruction: "Mude o título",
    page,
    selectedId: "Hero-1",
    siteName: "Aurora",
    pagePath: "/",
    history: [
      { role: "user", text: "oi" },
      { role: "assistant", text: "olá" },
    ],
  });
  assert.match(p, /Site: Aurora — página \//);
  assert.match(p, /Pessoa: oi/);
  assert.match(p, /Você: olá/);
  assert.match(p, /## Bloco selecionado\n\{"type":"Hero"/);
  assert.match(p, /## Pedido\nMude o título$/);
});

test("the six page tools are the only ones allowed besides skills", () => {
  assert.deepEqual(TOOL_NAMES.map((n) => n.replace("mcp__site__", "")).sort(), [
    "insert_block",
    "move_block",
    "remove_block",
    "replace_content",
    "update_block",
    "update_page",
  ]);
});

test("the art direction moved to a skill: the skills prompt no longer embeds it", () => {
  assert.ok(SYSTEM_PROMPT.includes(ART_DIRECTION));
  assert.equal(SYSTEM_PROMPT_SKILLS.includes(ART_DIRECTION), false);
  assert.match(SYSTEM_PROMPT_SKILLS, /direcao-de-arte/);
  // Everything else the model needs is still there.
  assert.match(SYSTEM_PROMPT_SKILLS, /Catálogo de blocos/);
  assert.match(SYSTEM_PROMPT_SKILLS, /Biblioteca de imagens/);
  assert.match(SYSTEM_PROMPT_SKILLS, /Personalização/);
});

test("every allowed skill exists on disk with valid frontmatter", () => {
  const root = path.join(skillsCwd(), ".claude", "skills");
  for (const name of SKILL_NAMES) {
    const file = path.join(root, name, "SKILL.md");
    assert.ok(fs.existsSync(file), `missing ${file}`);
    const text = fs.readFileSync(file, "utf-8");
    const fm = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(text);
    assert.ok(fm, `${name}: frontmatter must have name and description`);
    assert.equal(fm[1], name, "name must match the folder");
    assert.ok(fm[2].length > 30, `${name}: description too short to trigger`);
  }
});
