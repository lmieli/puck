// Floating WhatsApp bubble. The client types a phone number and an optional
// greeting; we turn them into a plain wa.me link. No script, no embed: just a
// link, so there is nothing to attack. Pure module (no database, no DOM).

export type WhatsApp = {
  /** Digits only, with country code (E.164 without the "+"). Empty = bubble off. */
  number: string;
  /** Text the chat opens with, so the person only has to press send. */
  message: string;
  /** Short text next to the icon on large screens. */
  label: string;
  position: "right" | "left";
};

export const EMPTY_WHATSAPP: WhatsApp = {
  number: "",
  message: "",
  label: "",
  position: "right",
};

export const MAX_MESSAGE = 300;
export const MAX_LABEL = 40;

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

export function validateWhatsApp(
  input: Record<string, unknown>
): { value: WhatsApp } | { error: string } {
  const raw = String(input.number ?? "").trim();
  const message = String(input.message ?? "")
    .replace(/[\u0000-\u0009\u000b-\u001f]/g, "")
    .trim();
  const label = String(input.label ?? "")
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
  const position = input.position === "left" ? "left" : "right";

  let number = "";
  if (raw) {
    number = normalizeNumber(raw);
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
  return { value: { number, message, label, position } };
}

/** Read what is stored, dropping anything that no longer validates. */
export function parseWhatsApp(raw: string | null | undefined): WhatsApp {
  try {
    const obj = JSON.parse(raw || "{}");
    const r = validateWhatsApp(obj && typeof obj === "object" ? obj : {});
    return "value" in r ? r.value : EMPTY_WHATSAPP;
  } catch {
    return EMPTY_WHATSAPP;
  }
}

/** The click-to-chat link, or "" when the bubble is off. */
export function whatsappUrl(w: WhatsApp): string {
  if (!w.number) return "";
  const text = w.message ? `?text=${encodeURIComponent(w.message)}` : "";
  return `https://wa.me/${w.number}${text}`;
}

/** "+55 (11) 91234-5678" for display. Other countries: "+" and the digits. */
export function formatNumber(number: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(number);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : number ? `+${number}` : "";
}
