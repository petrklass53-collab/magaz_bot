import { describe, expect, it } from "vitest";
import { matchProducts } from "../src/core/matching.service.js";
import { normalizeProductQuery } from "../src/normalizer/normalizer.js";

describe("Matching", () => {
  it("объединяет эквивалентные названия", () => {
    const result = matchProducts(
      normalizeProductQuery("Apple iPhone 16 Pro 256GB"),
      normalizeProductQuery("iPhone 16 PRO 256 ГБ Black"),
    );
    expect(result.matches).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("не объединяет 128GB и 256GB", () => {
    const result = matchProducts(
      normalizeProductQuery("iPhone 16 Pro 128GB"),
      normalizeProductQuery("iPhone 16 Pro 256GB"),
    );
    expect(result.matches).toBe(false);
  });
});
