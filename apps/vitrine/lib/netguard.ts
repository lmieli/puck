// Webhooks make OUR server call addresses typed by clients. Without care, a
// client could aim it at localhost, the cloud metadata service or the
// internal network (SSRF). This module only lets requests go to public
// addresses over HTTPS, checks every address the name resolves to, and
// connects to the address it checked (so the name cannot change in between).

import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/** Expand an IPv6 address to its 8 groups of 16 bits; null when malformed. */
function ipv6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  // Embedded IPv4 in the last 32 bits (::ffff:1.2.3.4).
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (v4) {
    const p = v4[1].split(".").map(Number);
    if (p.some((n) => n > 255)) return null;
    s =
      s.slice(0, -v4[1].length) +
      ((p[0] << 8) | p[1]).toString(16) +
      ":" +
      ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const all = [
    ...head,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...tail,
  ];
  const nums = all.map((g) => parseInt(g || "0", 16));
  return nums.length === 8 && nums.every((n) => n >= 0 && n <= 0xffff)
    ? nums
    : null;
}

function privateV4(a: number, b: number, c: number): boolean {
  return (
    a === 0 || // "this network"
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast, reserved, broadcast
  );
}

/** True for any address that is not a normal public internet address. */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip.split("%")[0]);
  if (kind === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return privateV4(a, b, c);
  }
  if (kind === 6) {
    const g = ipv6Groups(ip);
    if (!g) return true;
    const embeddedV4 = (hi: number, lo: number) =>
      privateV4(hi >> 8, hi & 255, lo >> 8);
    if (g.every((x) => x === 0)) return true; // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff)
      return embeddedV4(g[6], g[7]); // ::ffff:a.b.c.d
    if (g[0] === 0x64 && g[1] === 0xff9b) return embeddedV4(g[6], g[7]); // NAT64
    if (g[0] === 0x2002) return embeddedV4(g[1], g[2]); // 6to4
    if ((g[0] & 0xfe00) === 0xfc00) return true; // unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0xdb8) return true; // documentation
    if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // discard
    return false;
  }
  return true; // not an IP at all
}

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".intranet",
];

/** Dev and tests only: lets webhooks reach local addresses over plain HTTP. */
export const allowPrivateFromEnv = () =>
  process.env.VITRINE_ALLOW_PRIVATE_WEBHOOKS === "1";

/** Check an address before saving it. DNS is checked again at send time. */
export function parseWebhookUrl(
  raw: string,
  allowPrivate = false
): { url: URL } | { error: string } {
  const text = String(raw ?? "").trim();
  if (!text || text.length > 2000)
    return { error: "Informe o endereço do webhook." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return {
      error: "Endereço inválido. Cole a URL completa, começando com https://",
    };
  }
  if (
    allowPrivate ? !/^https?:$/.test(url.protocol) : url.protocol !== "https:"
  )
    return { error: "O endereço precisa começar com https://" };
  if (url.username || url.password)
    return { error: "O endereço não pode ter usuário e senha." };
  if (!allowPrivate && url.port && url.port !== "443")
    return { error: "Use a porta padrão (443) do https." };
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!allowPrivate) {
    if (
      host === "localhost" ||
      BLOCKED_SUFFIXES.some((s) => host.endsWith(s)) ||
      (!host.includes(".") && !net.isIP(host))
    )
      return { error: "Esse endereço é interno e não pode ser usado." };
    if (net.isIP(host) && isPrivateAddress(host))
      return { error: "Esse endereço é interno e não pode ser usado." };
  }
  return { url };
}

export type Lookup = (
  host: string
) => Promise<{ address: string; family: number }[]>;

const defaultLookup: Lookup = (host) =>
  dns.lookup(host, { all: true, verbatim: true });

export type SafeResponse = { status: number; body: string };

/**
 * POST (or other) to a validated URL. Every address the name resolves to must
 * be public; the request then goes to the first one. No redirects (a redirect
 * could point inside), a hard time limit and at most 4 KB of the answer read.
 */
export async function safeRequest(opts: {
  url: URL;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  allowPrivate?: boolean;
  lookup?: Lookup;
}): Promise<SafeResponse> {
  const { url, allowPrivate = false } = opts;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let target: { address: string; family: number };
  if (net.isIP(host)) {
    target = { address: host, family: net.isIP(host) };
    if (!allowPrivate && isPrivateAddress(host))
      throw new Error("Endereço interno bloqueado.");
  } else {
    const addrs = await (opts.lookup ?? defaultLookup)(host).catch(() => {
      throw new Error("Não foi possível encontrar o endereço (DNS).");
    });
    if (!addrs.length)
      throw new Error("Não foi possível encontrar o endereço (DNS).");
    if (!allowPrivate && addrs.some((a) => isPrivateAddress(a.address)))
      throw new Error(
        "Esse endereço aponta para a rede interna e foi bloqueado."
      );
    target = addrs[0];
  }

  const timeoutMs = opts.timeoutMs ?? 8000;
  const lib = url.protocol === "https:" ? https : http;
  return new Promise<SafeResponse>((resolve, reject) => {
    const body = opts.body ?? "";
    const req = lib.request(
      {
        host,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: opts.method ?? "POST",
        headers: {
          ...opts.headers,
          "content-length": String(Buffer.byteLength(body)),
        },
        servername: net.isIP(host) ? undefined : host,
        // Connect to the address that was checked, whatever the name says now.
        lookup: (_h, options, cb) => {
          if ((options as { all?: boolean }).all)
            (
              cb as unknown as (
                e: null,
                a: { address: string; family: number }[]
              ) => void
            )(null, [target]);
          else cb(null, target.address, target.family);
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          if (size < 4096) chunks.push(c);
          size += c.length;
        });
        res.on("end", () => {
          clearTimeout(timer);
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8").slice(0, 4096),
          });
        });
        res.on("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
      }
    );
    const timer = setTimeout(() => {
      req.destroy(new Error("O destino demorou demais para responder."));
    }, timeoutMs);
    req.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    req.end(body);
  });
}
