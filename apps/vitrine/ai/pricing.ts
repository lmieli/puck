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

/** Starting catalogue. Prices are examples (1 credit = US$ 0.001): adjust them. */
export const DEFAULT_MODELS: {
  id: string;
  label: string;
  inPerMtok: number;
  outPerMtok: number;
}[] = [
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet (equilibrado)",
    inPerMtok: 3000,
    outPerMtok: 15000,
  },
  {
    id: "anthropic/claude-opus-4.1",
    label: "Claude Opus (máxima qualidade)",
    inPerMtok: 15000,
    outPerMtok: 75000,
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini Flash (rápido e barato)",
    inPerMtok: 300,
    outPerMtok: 2500,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini (econômico)",
    inPerMtok: 150,
    outPerMtok: 600,
  },
];

export const FALLBACK_MODEL_ID =
  process.env.VITRINE_AI_MODEL || "anthropic/claude-sonnet-4.5";
