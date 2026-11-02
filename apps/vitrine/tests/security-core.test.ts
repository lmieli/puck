// Secrets at rest and the SSRF guard (addresses, URL rules and real requests
// against a local server).

import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { decrypt, deriveKey, encrypt, maskUrl } from "../lib/secrets.ts";
import {
  isPrivateAddress,
  parseWebhookUrl,
  safeRequest,
} from "../lib/netguard.ts";

const key = deriveKey("segredo-de-teste");

test("secrets round-trip and are not readable without the key", () => {
  const url = "https://hooks.zapier.com/hooks/catch/123/abc/";
  const sealed = encrypt(url, key);
  assert.ok(sealed.startsWith("v1:"));
  assert.equal(sealed.includes("zapier"), false, "not stored in the clear");
  assert.equal(decrypt(sealed, key), url);
  assert.notEqual(encrypt(url, key), sealed, "a fresh nonce each time");
  assert.throws(
    () => decrypt(sealed, deriveKey("outra chave")),
    /chave errada|alterado/
  );
});

test("a tampered or malformed secret is detected, not decrypted to garbage", () => {
  const sealed = encrypt("valor", key);
  const raw = Buffer.from(sealed.slice(3), "base64");
  raw[raw.length - 1] ^= 1;
  assert.throws(() => decrypt("v1:" + raw.toString("base64"), key), /alterado/);
  assert.throws(() => decrypt("plain text", key), /formato desconhecido/);
  assert.throws(() => decrypt("v1:AAAA", key), /corrompido/);
  assert.equal(decrypt(encrypt("", key), key), "");
  assert.equal(decrypt(encrypt("ação ✓", key), key), "ação ✓");
});

test("masking keeps the host and hides the token", () => {
  assert.equal(
    maskUrl("https://hooks.zapier.com/hooks/catch/123/secrettoken/"),
    "https://hooks.zapier.com/…"
  );
  assert.equal(maskUrl("nope"), "(endereço inválido)");
});

test("private, local and reserved addresses are recognised", () => {
  const privateOnes = [
    "127.0.0.1",
    "127.9.9.9",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "198.18.0.1",
    "192.0.2.1",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:7f00:1",
    "64:ff9b::7f00:1",
    "2002:7f00:1::1",
    "not-an-ip",
    "",
  ];
  for (const ip of privateOnes) assert.equal(isPrivateAddress(ip), true, ip);
  const publicOnes = [
    "8.8.8.8",
    "1.1.1.1",
    "172.15.0.1",
    "172.32.0.1",
    "100.63.0.1",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
    "::ffff:8.8.8.8",
  ];
  for (const ip of publicOnes) assert.equal(isPrivateAddress(ip), false, ip);
});

test("webhook addresses must be public https URLs", () => {
  const ok = (u: string) => assert.ok("url" in parseWebhookUrl(u), u);
  const bad = (u: string, re: RegExp) => {
    const r = parseWebhookUrl(u);
    assert.ok("error" in r, u);
    assert.match(r.error, re, u);
  };
  ok("https://hooks.zapier.com/hooks/catch/1/abc/");
  ok("https://hook.eu1.make.com/abc123");
  ok("https://n8n.minhaempresa.com.br/webhook/xyz?token=1");
  ok("https://8.8.8.8/hook");
  bad("http://hooks.zapier.com/x", /https/);
  bad("ftp://x.com/y", /https/);
  bad("javascript:alert(1)", /https|inválido/);
  bad("", /Informe/);
  bad("   ", /Informe/);
  bad("não é url", /inválido/);
  bad("https://user:pass@hooks.zapier.com/x", /usuário e senha/);
  bad("https://localhost/x", /interno/);
  bad("https://app.localhost/x", /interno/);
  bad("https://servidor.local/x", /interno/);
  bad("https://db.internal/x", /interno/);
  bad("https://intranet/x", /interno/);
  bad("https://127.0.0.1/x", /interno/);
  bad("https://169.254.169.254/latest/meta-data", /interno/);
  bad("https://10.1.2.3/x", /interno/);
  bad("https://[::1]/x", /interno/);
  bad("https://[::ffff:127.0.0.1]/x", /interno/);
  bad("https://hooks.zapier.com:8443/x", /porta/);
  bad("https://x.com/" + "a".repeat(2100), /Informe/);
});

/** A tiny server that records what it receives. */
async function server(
  handler: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    body: string
  ) => void
) {
  const seen: {
    headers: http.IncomingHttpHeaders;
    body: string;
    method?: string;
  }[] = [];
  const srv = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ headers: req.headers, body, method: req.method });
      handler(req, res, body);
    });
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const port = (srv.address() as AddressInfo).port;
  return {
    seen,
    port,
    close: () => {
      srv.closeAllConnections();
      srv.close();
    },
  };
}

test("a request reaches a public-looking name only if every address it resolves to is public", async () => {
  const s = await server((_q, res) => res.end("ok"));
  try {
    const url = new URL(`http://hook.test:${s.port}/x`);
    const lookupLocal = async () => [{ address: "127.0.0.1", family: 4 }];
    await assert.rejects(
      () => safeRequest({ url, body: "{}", lookup: lookupLocal }),
      /rede interna/
    );
    const mixed = async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ];
    await assert.rejects(
      () => safeRequest({ url, body: "{}", lookup: mixed }),
      /rede interna/
    );
    await assert.rejects(
      () =>
        safeRequest({
          url: new URL(`http://127.0.0.1:${s.port}/`),
          body: "{}",
        }),
      /interno/
    );
    await assert.rejects(
      () =>
        safeRequest({ url: new URL(`http://[::1]:${s.port}/`), body: "{}" }),
      /interno/
    );
    await assert.rejects(
      () =>
        safeRequest({
          url,
          body: "{}",
          lookup: async () => {
            throw new Error("nxdomain");
          },
        }),
      /DNS/
    );
    await assert.rejects(
      () => safeRequest({ url, body: "{}", lookup: async () => [] }),
      /DNS/
    );
    assert.equal(s.seen.length, 0, "nothing was ever sent");
  } finally {
    s.close();
  }
});

test("the request goes to the address that was checked, with the right Host and body", async () => {
  const s = await server((_q, res) => {
    res.statusCode = 201;
    res.end("created");
  });
  try {
    const r = await safeRequest({
      url: new URL(`http://hook.test:${s.port}/path?q=1`),
      headers: {
        "content-type": "application/json",
        "x-vitrine-signature": "sha256=abc",
      },
      body: '{"a":"ção"}',
      allowPrivate: true,
      lookup: async () => [{ address: "127.0.0.1", family: 4 }], // the name says hook.test, we connect to what was checked
    });
    assert.equal(r.status, 201);
    assert.equal(r.body, "created");
    assert.equal(s.seen[0].method, "POST");
    assert.equal(s.seen[0].headers.host, `hook.test:${s.port}`);
    assert.equal(s.seen[0].headers["x-vitrine-signature"], "sha256=abc");
    assert.equal(s.seen[0].body, '{"a":"ção"}');
    assert.equal(
      s.seen[0].headers["content-length"],
      String(Buffer.byteLength('{"a":"ção"}'))
    );
  } finally {
    s.close();
  }
});

test("redirects are not followed, slow servers time out and big answers are cut", async () => {
  const s = await server((req, res) => {
    if (req.url === "/redirect") {
      res.statusCode = 302;
      res.setHeader("location", "http://169.254.169.254/");
      res.end();
    } else if (req.url === "/slow") {
      /* never answers */
    } else res.end("x".repeat(100_000));
  });
  const lookup = async () => [{ address: "127.0.0.1", family: 4 }];
  try {
    const base = `http://hook.test:${s.port}`;
    const red = await safeRequest({
      url: new URL(`${base}/redirect`),
      body: "{}",
      allowPrivate: true,
      lookup,
    });
    assert.equal(red.status, 302, "the redirect is returned, not followed");
    assert.equal(s.seen.length, 1, "only one request was made");
    await assert.rejects(
      () =>
        safeRequest({
          url: new URL(`${base}/slow`),
          body: "{}",
          allowPrivate: true,
          lookup,
          timeoutMs: 250,
        }),
      /demorou demais/
    );
    const big = await safeRequest({
      url: new URL(`${base}/big`),
      body: "{}",
      allowPrivate: true,
      lookup,
    });
    assert.ok(big.body.length <= 4096 && big.body.length > 0);
  } finally {
    s.close();
  }
});
