import { describe, expect, it } from "vitest";
import { normalizeProductQuery } from "../src/normalizer/normalizer.js";

describe("Normalizer", () => {
  it.each([
    "iPhone 16 Pro 256GB",
    "iPhone 16 Pro 256 ГБ",
    "Apple  iPhone 16 PRO, 256gb black",
  ])("нормализует варианты iPhone: %s", (input) => {
    const result = normalizeProductQuery(input);
    expect(result.brand).toBe("Apple");
    expect(result.model).toBe("iPhone 16 Pro");
    expect(result.storage).toBe("256GB");
    expect(result.category).toBe("smartphone");
  });

  it("различает объём памяти", () => {
    const left = normalizeProductQuery("iPhone 16 Pro 128GB");
    const right = normalizeProductQuery("iPhone 16 Pro 256GB");
    expect(left.normalizedName).not.toBe(right.normalizedName);
  });

  it("сводит Apple 16 Pro к той же модели iPhone", () => {
    const result = normalizeProductQuery("Apple 16 Pro 256 ГБ черный");
    expect(result.model).toBe("iPhone 16 Pro");
    expect(result.category).toBe("smartphone");
    expect(result.color).toBe("black");
  });

  it("понимает русское название бренда", () => {
    expect(normalizeProductQuery("Самсунг S25 256 ГБ").brand).toBe("Samsung");
    expect(normalizeProductQuery("Самсунг S25 256 ГБ").model).toBe("Galaxy S25");
  });

  it("определяет бытовую технику и ёмкость", () => {
    const result = normalizeProductQuery("Bosch стиральная машина 8 кг");
    expect(result.brand).toBe("Bosch");
    expect(result.category).toBe("washing_machine");
    expect(result.variant).toBe("8kg");
  });
});
