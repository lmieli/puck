// Credits: the unit the agency sells. Every model has a price in credits per
// one million tokens (input and output are priced separately, like the
// providers do). The agency sets those prices, so the margin is theirs.

export type ModelPrice = { inPerMtok: number; outPerMtok: number };

/** Credits for one model call, rounded up. A call that used tokens costs at least 1. */
export function costCredits(
  price: ModelPrice,
  inputTokens: number,
  outputTokens: number
) {
  const inTok = Math.max(0, Math.floor(inputTokens) || 0);
  const outTok = Math.max(0, Math.floor(outputTokens) || 0);
  if (inTok + outTok === 0) return 0;
  const raw = (inTok * price.inPerMtok + outTok * price.outPerMtok) / 1e6;
  return Math.max(1, Math.ceil(raw));
}

/**
 * Starting catalogue. Prices are examples (1 credit = US$ 0.001, OpenRouter's
 * price with no margin): adjust them.
 */
export const DEFAULT_MODELS: {
  id: string;
  label: string;
  inPerMtok: number;
  outPerMtok: number;
}[] = [
  {
    id: "anthropic/claude-sonnet-5.5",
    label: "Claude Sonnet 5.5 (equilibrado)",
    inPerMtok: 2000,
    outPerMtok: 10000,
  },
  {
    id: "anthropic/claude-opus-5.5",
    label: "Claude Opus 5.5 (máxima qualidade)",
    inPerMtok: 4000,
    outPerMtok: 20000,
  },
  {
    id: "openai/gpt-6.1-terra",
    label: "GPT-6.1 Terra (rápido)",
    inPerMtok: 1000,
    outPerMtok: 5000,
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash (rápido)",
    inPerMtok: 825,
    outPerMtok: 4125,
  },
  {
    id: "anthropic/claude-haiku-5.5",
    label: "Claude Haiku 5.5 (econômico)",
    inPerMtok: 100,
    outPerMtok: 500,
  },
];

/** Catalogue shipped before the 5.x models; disabled on upgrade when unused. */
export const RETIRED_DEFAULT_MODELS = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.1",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
];

export const FALLBACK_MODEL_ID =
  process.env.VITRINE_AI_MODEL || "anthropic/claude-sonnet-5.5";
