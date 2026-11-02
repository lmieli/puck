// WhatsApp bubble: number normalisation, validation and the wa.me link.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_WHATSAPP,
  formatNumber,
  normalizeNumber,
  parseWhatsApp,
  validateWhatsApp,
  whatsappUrl,
} from "../lib/whatsapp.ts";

const ok = (input: Record<string, unknown>) => {
  const r = validateWhatsApp(input);
  assert.ok("value" in r, "error" in r ? r.error : "");
  return r.value;
};
const bad = (input: Record<string, unknown>) => {
  const r = validateWhatsApp(input);
  assert.ok("error" in r, "should have been rejected");
  return r.error;
};

test("Brazilian numbers are typed any way and end up as 55 + area code + number", () => {
  assert.equal(normalizeNumber("(11) 91234-5678"), "5511912345678");
  assert.equal(normalizeNumber("11 91234 5678"), "5511912345678");
  assert.equal(normalizeNumber("+55 11 91234-5678"), "5511912345678");
  assert.equal(normalizeNumber("0055 11 91234-5678"), "5511912345678");
  assert.equal(
    normalizeNumber("(11) 3123-4567"),
    "551131234567",
    "landline, 10 digits"
  );
  assert.equal(normalizeNumber("5511912345678"), "5511912345678");
});

test("numbers from other countries are kept as typed, with their country code", () => {
  assert.equal(normalizeNumber("+1 415 555 2671"), "14155552671");
  assert.equal(normalizeNumber("+351 912 345 678"), "351912345678");
});

test("a leading + keeps the number as typed, even when it looks Brazilian without it", () => {
  // 11 digits starting with 1: a US number, not area code 14 in Brazil.
  assert.equal(normalizeNumber("+14155552671"), "14155552671");
  assert.equal(normalizeNumber("14155552671"), "5514155552671", "no +: Brazil");
});

test("things that are not phone numbers are rejected", () => {
  assert.equal(normalizeNumber(""), "");
  assert.equal(normalizeNumber("abc"), "");
  assert.equal(normalizeNumber("12345"), "");
  assert.equal(normalizeNumber("0000000000"), "");
  assert.equal(normalizeNumber("1".repeat(20)), "");
  assert.equal(normalizeNumber("55 11 1234"), "", "Brazil with too few digits");
  assert.match(bad({ number: "meu zap" }), /Número de WhatsApp inválido/);
  assert.match(bad({ number: "123" }), /\(11\) 91234-5678/, "shows an example");
});

test("an empty number turns the bubble off", () => {
  const w = ok({ number: "  ", message: "oi" });
  assert.equal(w.number, "");
  assert.equal(whatsappUrl(w), "");
});

test("the link carries the greeting, safely encoded", () => {
  const w = ok({
    number: "(11) 91234-5678",
    message: "Olá! Quero saber mais & visitar #1?",
  });
  assert.equal(
    whatsappUrl(w),
    "https://wa.me/5511912345678?text=Ol%C3%A1!%20Quero%20saber%20mais%20%26%20visitar%20%231%3F"
  );
  assert.equal(
    whatsappUrl(ok({ number: "11912345678" })),
    "https://wa.me/5511912345678"
  );
});

test("a hostile message cannot break out of the link", () => {
  const w = ok({
    number: "11912345678",
    message: '"><script>alert(1)</script>&x=1',
  });
  const url = whatsappUrl(w);
  assert.ok(url.startsWith("https://wa.me/5511912345678?text="));
  assert.equal(/[<>"]/.test(url), false, "no raw markup characters in the URL");
  assert.equal(
    new URL(url).searchParams.get("text"),
    '"><script>alert(1)</script>&x=1'
  );
  assert.equal(new URL(url).hostname, "wa.me");
});

test("limits and options", () => {
  assert.match(
    bad({ number: "11912345678", message: "x".repeat(301) }),
    /300 caracteres/
  );
  assert.match(
    bad({ number: "11912345678", label: "x".repeat(41) }),
    /40 caracteres/
  );
  assert.equal(
    ok({ number: "11912345678", position: "left" }).position,
    "left"
  );
  assert.equal(
    ok({ number: "11912345678", position: "<evil>" }).position,
    "right"
  );
  assert.equal(
    ok({ number: "11912345678", message: "a\u0000b\u0007c" }).message,
    "abc"
  );
  assert.equal(
    ok({ number: "11912345678", message: "linha 1\nlinha 2" }).message,
    "linha 1\nlinha 2"
  );
});

test("stored values that are corrupt are ignored, not trusted", () => {
  assert.deepEqual(parseWhatsApp("not json"), EMPTY_WHATSAPP);
  assert.deepEqual(parseWhatsApp(""), EMPTY_WHATSAPP);
  assert.deepEqual(
    parseWhatsApp(JSON.stringify({ number: "javascript:alert(1)" })),
    EMPTY_WHATSAPP
  );
  assert.equal(
    parseWhatsApp(
      JSON.stringify({ number: "5511912345678", label: "Fale conosco" })
    ).label,
    "Fale conosco"
  );
});

test("numbers are shown the way people read them", () => {
  assert.equal(formatNumber("5511912345678"), "+55 (11) 91234-5678");
  assert.equal(formatNumber("551131234567"), "+55 (11) 3123-4567");
  assert.equal(formatNumber("14155552671"), "+14155552671");
  assert.equal(formatNumber(""), "");
});
