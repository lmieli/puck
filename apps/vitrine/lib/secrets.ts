// Secrets at rest (webhook URLs with tokens, API keys). AES-256-GCM: the value
// is unreadable without the key, and any change to the stored text is detected
// instead of decrypting to garbage. The key is injected, so this stays pure.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const PREFIX = "v1:";

/** A 32-byte key from any secret string (the environment variable). */
export function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`vitrine-secrets:${secret}`).digest();
}

export function encrypt(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return (
    PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")
  );
}

/** Throws when the key is wrong or the text was altered. */
export function decrypt(stored: string, key: Buffer): string {
  if (!stored.startsWith(PREFIX))
    throw new Error("Segredo em formato desconhecido.");
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (raw.length < 28) throw new Error("Segredo corrompido.");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  try {
    return Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      "Não foi possível ler o segredo: chave errada ou dado alterado."
    );
  }
}

/** "https://hooks.zapier.com/…/abc" -> "https://hooks.zapier.com/…" : enough to recognise, not to use. */
export function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return "(endereço inválido)";
  }
}
