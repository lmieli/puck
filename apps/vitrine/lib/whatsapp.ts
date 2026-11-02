// Floating WhatsApp bubble. The client types a phone number and an optional
// greeting; we turn them into a plain wa.me link. No script, no embed: just a
// link, so there is nothing to attack. Pure module (no database, no DOM).
//
// Two rules decide whether the bubble shows up on a given page at a given
// moment: where it appears (all pages, only some, all but some) and the
// service hours (per weekday, in the site's time zone, hidden or with another
// message outside them). Both are evaluated on the server on every request,
// so the bubble stays a plain link.

import { normalizePath } from "./paths.ts";

/** Open and close as "HH:MM", or null when closed that day. */
export type Day = { open: string; close: string } | null;

export type Schedule = {
  enabled: boolean;
  /** IANA time zone of the business: the hours are read in it, not in the visitor's. */
  timezone: string;
  /** Sunday first: index 0 = Sunday ... 6 = Saturday. */
  days: Day[];
  /** What to do outside the hours: hide the bubble, or keep it with another message. */
  outside: "hide" | "message";
  outsideMessage: string;
  outsideLabel: string;
};

export type Visibility = {
  mode: "all" | "only" | "except";
  /** Normalised page paths, used by "only" and "except". */
  paths: string[];
};

export type WhatsApp = {
  /** Digits only, with country code (E.164 without the "+"). Empty = bubble off. */
  number: string;
  /** Text the chat opens with, so the person only has to press send. */
  message: string;
  /** Short text next to the icon on large screens. */
  label: string;
  position: "right" | "left";
  schedule: Schedule;
  visibility: Visibility;
};

export const TIMEZONES: [string, string][] = [
  ["America/Sao_Paulo", "Brasília (padrão do Brasil)"],
  ["America/Manaus", "Manaus"],
  ["America/Cuiaba", "Cuiabá"],
  ["America/Rio_Branco", "Rio Branco"],
  ["America/Noronha", "Fernando de Noronha"],
  ["Europe/Lisbon", "Lisboa"],
];

export const DAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const WEEKDAY: Day = { open: "09:00", close: "18:00" };
/** Monday to Friday, 9h to 18h: what the form starts with. */
export const DEFAULT_DAYS: Day[] = [
  null,
  WEEKDAY,
  WEEKDAY,
  WEEKDAY,
  WEEKDAY,
  WEEKDAY,
  null,
];

export const EMPTY_SCHEDULE: Schedule = {
  enabled: false,
  timezone: "America/Sao_Paulo",
  days: DEFAULT_DAYS,
  outside: "hide",
  outsideMessage: "",
  outsideLabel: "",
};

export const EMPTY_WHATSAPP: WhatsApp = {
  number: "",
  message: "",
  label: "",
  position: "right",
  schedule: EMPTY_SCHEDULE,
  visibility: { mode: "all", paths: [] },
};

export const MAX_MESSAGE = 300;
export const MAX_LABEL = 40;
export const MAX_PAGES = 50;

/**
 * Digits with country code. A leading "+" or "00" means the country code is
 * already there. Without it, a Brazilian number (10 or 11 digits: area code +
 * number) gets 55. Returns "" when it cannot be a phone.
 */
export function normalizeNumber(input: string): string {
  const explicit = /^\s*(\+|00)/.test(input);
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!explicit && (d.length === 10 || d.length === 11)) d = `55${d}`;
  // Brazil: 55 + area code (2) + 8 or 9 digits.
  if (d.startsWith("55") && (d.length < 12 || d.length > 13)) return "";
  return /^[1-9]\d{9,14}$/.test(d) ? d : "";
}

/* ------------------------------------------------------------------ */
/* Validation                                                            */
/* ------------------------------------------------------------------ */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const text = (v: unknown) => String(v ?? "");
const clean = (v: unknown) =>
  text(v)
    .replace(/[\u0000-\u001f]/g, "")
    .trim();

/** Same shape as what is stored; the form is flattened into it by fromForm. */
type Raw = Record<string, unknown>;

/** The dashboard form is flat (day1_on, day1_open...); turn it into the stored shape. */
function fromForm(input: Record<string, unknown>): Raw {
  const days = Array.from({ length: 7 }, (_, i) =>
    input[`day${i}_on`] === "on"
      ? {
          open: clean(input[`day${i}_open`]),
          close: clean(input[`day${i}_close`]),
        }
      : null
  );
  const paths = Array.isArray(input.paths)
    ? input.paths
    : input.paths
    ? [input.paths]
    : [];
  return {
    number: input.number,
    message: input.message,
    label: input.label,
    position: input.position,
    schedule: {
      enabled: input.hoursEnabled === "on",
      timezone: input.timezone,
      days,
      outside: input.outside,
      outsideMessage: input.outsideMessage,
      outsideLabel: input.outsideLabel,
    },
    visibility: { mode: input.visibilityMode, paths },
  };
}

function validateSchedule(
  raw: unknown
): { value: Schedule } | { error: string } {
  if (!raw || typeof raw !== "object") return { value: EMPTY_SCHEDULE };
  const r = raw as Record<string, unknown>;
  const timezone = text(r.timezone) || EMPTY_SCHEDULE.timezone;
  if (!TIMEZONES.some(([z]) => z === timezone))
    return { error: "Fuso horário inválido. Escolha um da lista." };

  const days: Day[] = [];
  const list = Array.isArray(r.days) ? r.days : DEFAULT_DAYS;
  for (let i = 0; i < 7; i++) {
    const d = list[i] as { open?: unknown; close?: unknown } | null | undefined;
    if (!d) {
      days.push(null);
      continue;
    }
    const open = clean(d.open);
    const close = clean(d.close);
    if (!TIME.test(open) || !TIME.test(close))
      return {
        error: `${DAY_NAMES[i]}: horário inválido. Use o formato 09:00.`,
      };
    if (open === close)
      return {
        error: `${DAY_NAMES[i]}: a abertura e o fechamento são iguais.`,
      };
    days.push({ open, close });
  }

  const enabled = r.enabled === true;
  if (enabled && days.every((d) => !d))
    return {
      error:
        "Marque pelo menos um dia de atendimento ou desligue o horário de atendimento.",
    };

  const outside = r.outside === "message" ? "message" : "hide";
  const outsideMessage = clean(r.outsideMessage);
  const outsideLabel = clean(r.outsideLabel);
  if (outsideMessage.length > MAX_MESSAGE)
    return {
      error: `A mensagem de fora do horário passa de ${MAX_MESSAGE} caracteres.`,
    };
  if (outsideLabel.length > MAX_LABEL)
    return {
      error: `O texto do botão fora do horário passa de ${MAX_LABEL} caracteres.`,
    };
  return {
    value: {
      enabled,
      timezone,
      days,
      outside,
      outsideMessage,
      outsideLabel,
    },
  };
}

function validateVisibility(
  raw: unknown
): { value: Visibility } | { error: string } {
  if (!raw || typeof raw !== "object")
    return { value: EMPTY_WHATSAPP.visibility };
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "only" || r.mode === "except" ? r.mode : "all";
  const paths = [
    ...new Set(
      (Array.isArray(r.paths) ? r.paths : [])
        .map((p) => normalizePath(text(p)))
        .slice(0, 400)
    ),
  ];
  if (paths.length > MAX_PAGES)
    return { error: `Escolha no máximo ${MAX_PAGES} páginas.` };
  if (mode === "only" && !paths.length)
    return {
      error: 'Marque pelo menos uma página ou escolha "Todas as páginas".',
    };
  return { value: { mode, paths: mode === "all" ? [] : paths } };
}

function validateRaw(raw: Raw): { value: WhatsApp } | { error: string } {
  const numberRaw = clean(raw.number);
  const message = text(raw.message)
    .replace(/[\u0000-\u0009\u000b-\u001f]/g, "")
    .trim();
  const label = clean(raw.label);
  const position = raw.position === "left" ? "left" : "right";

  let number = "";
  if (numberRaw) {
    number = normalizeNumber(numberRaw);
    if (!number)
      return {
        error:
          "Número de WhatsApp inválido. Digite com o DDD, por exemplo (11) 91234-5678. Fora do Brasil, comece com + e o código do país.",
      };
  }
  if (message.length > MAX_MESSAGE)
    return {
      error: `A mensagem de abertura passa de ${MAX_MESSAGE} caracteres.`,
    };
  if (label.length > MAX_LABEL)
    return { error: `O texto do botão passa de ${MAX_LABEL} caracteres.` };

  const schedule = validateSchedule(raw.schedule);
  if ("error" in schedule) return schedule;
  const visibility = validateVisibility(raw.visibility);
  if ("error" in visibility) return visibility;
  return {
    value: {
      number,
      message,
      label,
      position,
      schedule: schedule.value,
      visibility: visibility.value,
    },
  };
}

/** Validate what the dashboard form sent. */
export function validateWhatsApp(
  input: Record<string, unknown>
): { value: WhatsApp } | { error: string } {
  return validateRaw(fromForm(input));
}

/** Read what is stored (older records without hours or pages included); anything invalid means off. */
export function parseWhatsApp(raw: string | null | undefined): WhatsApp {
  try {
    const obj = JSON.parse(raw || "{}");
    const r = validateRaw(obj && typeof obj === "object" ? obj : {});
    return "value" in r ? r.value : EMPTY_WHATSAPP;
  } catch {
    return EMPTY_WHATSAPP;
  }
}

/* ------------------------------------------------------------------ */
/* Deciding what to show                                                 */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday (0 = Sunday) and minutes since midnight in the given time zone. */
function localTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: Math.max(0, WEEKDAYS.indexOf(get("weekday"))),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Is the business open at this moment? Opening is inclusive and closing is
 * exclusive. A window that ends before it starts (22:00 to 02:00) runs past
 * midnight into the next day. With hours turned off it is always open.
 */
export function openNow(w: WhatsApp, now: Date): boolean {
  const s = w.schedule;
  if (!s.enabled) return true;
  const { day, minutes: m } = localTime(now, s.timezone);
  const today = s.days[day];
  if (today) {
    const open = minutes(today.open);
    const close = minutes(today.close);
    if (open < close ? m >= open && m < close : m >= open) return true;
  }
  const yesterday = s.days[(day + 6) % 7];
  if (yesterday) {
    const open = minutes(yesterday.open);
    const close = minutes(yesterday.close);
    if (close < open && m < close) return true;
  }
  return false;
}

/** Does the "where it appears" rule allow the bubble on this page? */
export function showsOnPath(v: Visibility, path: string): boolean {
  if (v.mode === "all") return true;
  const listed = v.paths.includes(normalizePath(path));
  return v.mode === "only" ? listed : !listed;
}

/**
 * What to render for this page right now: the bubble as configured, the same
 * bubble with its out-of-hours message, or null when it should not show.
 */
export function resolveBubble(
  w: WhatsApp,
  path: string,
  now: Date
): WhatsApp | null {
  if (!w.number) return null;
  if (!showsOnPath(w.visibility, path)) return null;
  if (openNow(w, now)) return w;
  if (w.schedule.outside === "hide") return null;
  return {
    ...w,
    message: w.schedule.outsideMessage || w.message,
    label: w.schedule.outsideLabel || w.label,
  };
}

/* ------------------------------------------------------------------ */
/* Link and display                                                      */
/* ------------------------------------------------------------------ */

/** The click-to-chat link, or "" when the bubble is off. */
export function whatsappUrl(w: Pick<WhatsApp, "number" | "message">): string {
  if (!w.number) return "";
  const text = w.message ? `?text=${encodeURIComponent(w.message)}` : "";
  return `https://wa.me/${w.number}${text}`;
}

/** "+55 (11) 91234-5678" for display. Other countries: "+" and the digits. */
export function formatNumber(number: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(number);
  if (m) return `+55 (${m[1]}) ${m[2]}-${m[3]}`;
  return number ? `+${number}` : "";
}
