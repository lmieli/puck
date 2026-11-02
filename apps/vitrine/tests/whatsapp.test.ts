// WhatsApp bubble: number normalisation, validation and the wa.me link.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_WHATSAPP,
  formatNumber,
  normalizeNumber,
  openNow,
  parseWhatsApp,
  resolveBubble,
  showsOnPath,
  validateWhatsApp,
  whatsappUrl,
  type WhatsApp,
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

/* ------------------------------ service hours ------------------------------ */

/** A form like the dashboard sends it: Monday to Friday, 9h to 18h. */
const hoursForm = (extra: Record<string, unknown> = {}) => ({
  number: "11912345678",
  message: "Olá!",
  label: "Fale conosco",
  hoursEnabled: "on",
  timezone: "America/Sao_Paulo",
  day1_on: "on",
  day1_open: "09:00",
  day1_close: "18:00",
  day2_on: "on",
  day2_open: "09:00",
  day2_close: "18:00",
  day3_on: "on",
  day3_open: "09:00",
  day3_close: "18:00",
  day4_on: "on",
  day4_open: "09:00",
  day4_close: "18:00",
  day5_on: "on",
  day5_open: "09:00",
  day5_close: "18:00",
  ...extra,
});
const at = (iso: string) => new Date(iso);

test("hours are read in the business time zone, with opening inclusive and closing exclusive", () => {
  const w = ok(hoursForm());
  // 2026-11-02 is a Monday; Brasília is UTC-3.
  assert.equal(openNow(w, at("2026-11-02T12:00:00Z")), true, "09:00 opens");
  assert.equal(openNow(w, at("2026-11-02T13:00:00Z")), true, "10:00");
  assert.equal(openNow(w, at("2026-11-02T20:59:00Z")), true, "17:59");
  assert.equal(openNow(w, at("2026-11-02T21:00:00Z")), false, "18:00 closes");
  assert.equal(openNow(w, at("2026-11-02T11:59:00Z")), false, "08:59 not yet");
  assert.equal(openNow(w, at("2026-11-02T03:00:00Z")), false, "midnight");
});

test("days off stay closed", () => {
  const w = ok(hoursForm());
  assert.equal(openNow(w, at("2026-11-01T15:00:00Z")), false, "Sunday noon");
  assert.equal(openNow(w, at("2026-11-07T15:00:00Z")), false, "Saturday noon");
  assert.equal(openNow(w, at("2026-11-06T15:00:00Z")), true, "Friday noon");
});

test("the same instant is open or closed depending on the time zone", () => {
  // Monday 2026-11-02T21:30Z = 18:30 in Brasília (closed) = 17:30 in Manaus (open).
  const t = at("2026-11-02T21:30:00Z");
  assert.equal(openNow(ok(hoursForm()), t), false);
  assert.equal(openNow(ok(hoursForm({ timezone: "America/Manaus" })), t), true);
});

test("a window that runs past midnight covers the next morning", () => {
  const w = ok({
    ...hoursForm({ day5_on: "on", day5_open: "22:00", day5_close: "02:00" }),
  });
  assert.equal(openNow(w, at("2026-11-07T02:00:00Z")), true, "Friday 23:00");
  assert.equal(
    openNow(w, at("2026-11-07T04:00:00Z")),
    true,
    "Saturday 01:00 (still Friday's window)"
  );
  assert.equal(
    openNow(w, at("2026-11-07T05:00:00Z")),
    false,
    "Saturday 02:00 closes"
  );
  assert.equal(openNow(w, at("2026-11-07T04:00:00Z")), true);
});

test("with hours off the bubble is always open", () => {
  const w = ok({ number: "11912345678" });
  assert.equal(w.schedule.enabled, false);
  assert.equal(openNow(w, at("2026-11-01T06:00:00Z")), true);
});

test("hours are validated with clear messages", () => {
  assert.match(
    bad(hoursForm({ day1_open: "9:00" })),
    /Segunda: horário inválido.*09:00/
  );
  assert.match(
    bad(hoursForm({ day2_close: "25:00" })),
    /Terça: horário inválido/
  );
  assert.match(
    bad(hoursForm({ day3_open: "10:00", day3_close: "10:00" })),
    /Quarta.*iguais/
  );
  assert.match(bad(hoursForm({ timezone: "Mars/Olympus" })), /Fuso horário/);
  assert.match(
    bad({
      number: "11912345678",
      hoursEnabled: "on",
      timezone: "America/Sao_Paulo",
    }),
    /pelo menos um dia/
  );
  assert.match(
    bad(hoursForm({ outsideMessage: "x".repeat(301) })),
    /fora do horário passa de 300/
  );
  assert.match(bad(hoursForm({ outsideLabel: "x".repeat(41) })), /passa de 40/);
});

test("outside the hours the bubble hides, or stays with another message", () => {
  const hide = ok(hoursForm({ outside: "hide" }));
  const keep = ok(
    hoursForm({
      outside: "message",
      outsideMessage: "Estamos fora do horário. Deixe sua mensagem!",
      outsideLabel: "Deixe sua mensagem",
    })
  );
  const open = at("2026-11-02T13:00:00Z");
  const closed = at("2026-11-02T23:00:00Z");
  assert.equal(resolveBubble(hide, "/", open)?.message, "Olá!");
  assert.equal(resolveBubble(hide, "/", closed), null);
  assert.equal(resolveBubble(keep, "/", open)?.label, "Fale conosco");
  const off = resolveBubble(keep, "/", closed)!;
  assert.equal(off.message, "Estamos fora do horário. Deixe sua mensagem!");
  assert.equal(off.label, "Deixe sua mensagem");
  assert.equal(off.number, "5511912345678");
  // The other message is optional: without it the normal one is used.
  const noText = ok(hoursForm({ outside: "message" }));
  assert.equal(resolveBubble(noText, "/", closed)?.message, "Olá!");
});

/* ------------------------------ where it appears ------------------------------ */

const pages = (mode: string, paths: string[]) =>
  ok({ number: "11912345678", visibilityMode: mode, paths });

test("by default the bubble shows on every page", () => {
  const w = ok({ number: "11912345678" });
  assert.deepEqual(w.visibility, { mode: "all", paths: [] });
  assert.equal(showsOnPath(w.visibility, "/qualquer/coisa"), true);
});

test("only the marked pages, or all but the marked ones", () => {
  const only = pages("only", ["/", "/contato"]);
  assert.equal(showsOnPath(only.visibility, "/"), true);
  assert.equal(showsOnPath(only.visibility, "/contato"), true);
  assert.equal(showsOnPath(only.visibility, "/obrigado"), false);
  const except = pages("except", ["/obrigado"]);
  assert.equal(showsOnPath(except.visibility, "/obrigado"), false);
  assert.equal(showsOnPath(except.visibility, "/"), true);
});

test("paths are matched the way the site names pages", () => {
  const w = pages("except", ["Obrigado/", "//Sobre-Nos"]);
  assert.deepEqual(w.visibility.paths, ["/obrigado", "/sobre-nos"]);
  assert.equal(showsOnPath(w.visibility, "/OBRIGADO"), false);
  assert.equal(showsOnPath(w.visibility, "/sobre-nos/"), false);
});

test("a single checked page arrives as a string and still works", () => {
  assert.deepEqual(
    pages("only", "/contato" as unknown as string[]).visibility.paths,
    ["/contato"]
  );
});

test("page rule validation", () => {
  assert.match(
    bad({ number: "11912345678", visibilityMode: "only", paths: [] }),
    /pelo menos uma página/
  );
  assert.equal(
    pages("all", ["/x"]).visibility.paths.length,
    0,
    "no list kept when all pages"
  );
  assert.equal(pages("nonsense", ["/x"]).visibility.mode, "all");
  assert.deepEqual(
    pages("except", ["/a", "/a", "/A"]).visibility.paths,
    ["/a"],
    "no duplicates"
  );
  const many = Array.from({ length: 60 }, (_, i) => `/p${i}`);
  assert.match(
    bad({ number: "11912345678", visibilityMode: "except", paths: many }),
    /no máximo 50/
  );
});

test("the bubble needs both rules: right page and open hours", () => {
  const w = ok(hoursForm({ visibilityMode: "except", paths: ["/obrigado"] }));
  const open = at("2026-11-02T13:00:00Z");
  assert.ok(resolveBubble(w, "/", open));
  assert.equal(
    resolveBubble(w, "/obrigado", open),
    null,
    "hidden page, even when open"
  );
  assert.equal(
    resolveBubble(w, "/", at("2026-11-02T23:00:00Z")),
    null,
    "closed"
  );
  assert.equal(resolveBubble(ok({ number: "" }), "/", open), null, "no number");
});

test("older stored records (no hours, no page rule) keep working as before", () => {
  const w: WhatsApp = parseWhatsApp(
    JSON.stringify({
      number: "5511912345678",
      message: "Oi",
      label: "Zap",
      position: "left",
    })
  );
  assert.equal(w.number, "5511912345678");
  assert.equal(w.position, "left");
  assert.equal(w.schedule.enabled, false);
  assert.deepEqual(w.visibility, { mode: "all", paths: [] });
  assert.ok(resolveBubble(w, "/", at("2026-11-01T06:00:00Z")));
});

test("stored hours and pages survive a round trip; a corrupt schedule turns the bubble off", () => {
  const w = ok(
    hoursForm({
      outside: "message",
      outsideMessage: "Fora",
      visibilityMode: "only",
      paths: ["/"],
    })
  );
  assert.deepEqual(parseWhatsApp(JSON.stringify(w)), w);
  const broken = JSON.parse(JSON.stringify(w));
  broken.schedule.days[1] = { open: "xx", close: "yy" };
  assert.deepEqual(parseWhatsApp(JSON.stringify(broken)), EMPTY_WHATSAPP);
});
