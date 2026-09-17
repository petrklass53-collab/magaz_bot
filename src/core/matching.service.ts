import { normalizeProductQuery, type ProductQuery } from "../normalizer/normalizer.js";

export interface MatchResult {
  matches: boolean;
  confidence: number;
  reasons: string[];
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, " ").split(/\s+/).filter(Boolean));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((item) => right.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

export function matchProducts(expected: ProductQuery, candidate: ProductQuery): MatchResult {
  const reasons: string[] = [];

  if (expected.brand !== "Unknown" && candidate.brand !== "Unknown" && expected.brand !== candidate.brand) {
    return { matches: false, confidence: 0, reasons: ["Разные бренды"] };
  }
  if (expected.storage && candidate.storage && expected.storage !== candidate.storage) {
    return { matches: false, confidence: 0, reasons: ["Разный объём памяти"] };
  }
  if (expected.ram && candidate.ram && expected.ram !== candidate.ram) {
    return { matches: false, confidence: 0, reasons: ["Разный объём RAM"] };
  }
  if (expected.variant && candidate.variant && expected.variant !== candidate.variant) {
    return { matches: false, confidence: 0, reasons: ["Разная модификация"] };
  }
  if (expected.color && candidate.color && expected.color !== candidate.color) {
    return { matches: false, confidence: 0, reasons: ["Разный цвет"] };
  }
  if (expected.category !== "other" && candidate.category !== "other" && expected.category !== candidate.category) {
    return { matches: false, confidence: 0, reasons: ["Разные категории"] };
  }

  const modelScore = jaccard(tokens(expected.model), tokens(candidate.model));
  if (modelScore < 0.66) return { matches: false, confidence: modelScore, reasons: ["Модели не совпадают"] };

  let confidence = 0.55 + modelScore * 0.25;
  if (expected.brand === candidate.brand && expected.brand !== "Unknown") confidence += 0.1;
  if (expected.storage && expected.storage === candidate.storage) confidence += 0.1;
  if (!expected.storage || !candidate.storage) reasons.push("Память указана не у обоих предложений");

  return { matches: confidence >= 0.8, confidence: Math.min(confidence, 1), reasons };
}

export function matchOfferTitle(expected: ProductQuery, title: string): MatchResult {
  return matchProducts(expected, normalizeProductQuery(title));
}
