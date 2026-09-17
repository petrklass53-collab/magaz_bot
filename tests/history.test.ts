import { describe, expect, it } from "vitest";
import { priceSparkline } from "../src/core/history.service.js";

describe("price history", () => {
  it("строит компактный график от минимума к максимуму", () => {
    expect(priceSparkline([90_000, 95_000, 100_000])).toBe("▁▅█");
  });

  it("показывает ровную цену без деления на ноль", () => {
    expect(priceSparkline([89_990, 89_990, 89_990])).toBe("▅▅▅");
  });

  it("ограничивает длину и отбрасывает некорректные точки", () => {
    expect(priceSparkline([Number.NaN, -1, 10, 20, 30], 2)).toBe("▁█");
    expect(priceSparkline([])).toBeNull();
  });
});
