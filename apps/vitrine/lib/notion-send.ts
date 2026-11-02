// Talking to the Notion API: read a database, create a page. One host, fixed
// (api.notion.com), so there is no user-controlled address to guard. The key
// that unseals the client's token is passed in.

import { DeliveryError } from "./deliveries-core.ts";
import {
  buildPage,
  explainNotionError,
  NOTION_VERSION,
  type Mapping,
} from "./notion.ts";
import { decrypt } from "./secrets.ts";
import type { LeadRow } from "./signup.ts";

const base = () =>
  (process.env.NOTION_API_BASE || "https://api.notion.com").replace(/\/$/, "");

export type NotionResult = { status: number; json: unknown; body: string };

/** One call to the API with a time limit. Network failures throw a retryable DeliveryError. */
export async function notionCall(
  token: string,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<NotionResult> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
      headers: {
        authorization: `Bearer ${token}`,
        "notion-version": NOTION_VERSION,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new DeliveryError("Não foi possível falar com o Notion agora.");
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep the text
  }
  return { status: res.status, json, body: text.slice(0, 2000) };
}

export type NotionConfig = {
  /** Sealed token. */
  token: string;
  /** Last characters of the token, to recognise it in the panel. */
  hint: string;
  databaseId: string;
  dbTitle: string;
  form: string | null;
  columns: { id: string; name: string; type: string }[];
  mapping: Mapping;
};

export function readNotionConfig(raw: string): NotionConfig {
  return JSON.parse(raw) as NotionConfig;
}

/** Create the page and return its id. Throws DeliveryError (`permanent` when retrying cannot help). */
export async function createLeadPage(opts: {
  config: NotionConfig;
  lead: LeadRow;
  key: Buffer;
}): Promise<string> {
  let token: string;
  try {
    token = decrypt(opts.config.token, opts.key);
  } catch (e) {
    throw new DeliveryError((e as Error).message, true);
  }
  const page = buildPage(
    opts.config.databaseId,
    opts.config.mapping,
    opts.lead
  );
  const r = await notionCall(token, "POST", "/v1/pages", page);
  if (r.status >= 200 && r.status < 300)
    return String((r.json as { id?: string })?.id ?? "");
  const e = explainNotionError(r.status, r.body);
  throw new DeliveryError(e.message, e.permanent);
}

/** Move a page to the trash (used to clean up the test lead). */
export async function trashPage(token: string, pageId: string) {
  await notionCall(token, "PATCH", `/v1/pages/${pageId}`, { archived: true });
}
