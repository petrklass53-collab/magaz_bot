import { describe, expect, it } from "vitest";
import { rankOffers } from "../src/core/price.service.js";

describe("Price Engine", () => {
  it("складывает цену, доставку и сборы и сортирует по итогу", () => {
    const ranked = rankOffers([
      { source: "A", seller: "A", title: "A", price: 90_000, deliveryPrice: 2_000, currency: "RUB", availability: "in_stock", url: "https://example.com/a" },
      { source: "B", seller: "B", title: "B", price: 91_000, deliveryPrice: 0, mandatoryFees: 200, currency: "RUB", availability: "in_stock", url: "https://example.com/b" },
    ]);
    expect(ranked[0]!.seller).toBe("B");
    expect(ranked[0]!.totalPrice).toBe(91_200);
    expect(ranked[1]!.totalPrice).toBe(92_000);
  });

  it("отмечает аномально низкую цену", () => {
    const ranked = rankOffers([
      { source: "A", seller: "A", title: "A", price: 10_000, deliveryPrice: 0, currency: "RUB", availability: "in_stock", url: "https://example.com/a" },
      { source: "B", seller: "B", title: "B", price: 100_000, deliveryPrice: 0, currency: "RUB", availability: "in_stock", url: "https://example.com/b" },
      { source: "C", seller: "C", title: "C", price: 105_000, deliveryPrice: 0, currency: "RUB", availability: "in_stock", url: "https://example.com/c" },
    ]);
    expect(ranked[0]!.suspiciouslyCheap).toBe(true);
  });

  it("не ставит цену с неизвестной доставкой выше полного итога", () => {
    const ranked = rankOffers([
      { source: "A", seller: "A", title: "A", price: 80_000, deliveryPrice: 0, deliveryKnown: false, currency: "RUB", availability: "in_stock", url: "https://example.com/a" },
      { source: "B", seller: "B", title: "B", price: 82_000, deliveryPrice: 500, deliveryKnown: true, currency: "RUB", availability: "in_stock", url: "https://example.com/b" },
    ]);
    expect(ranked[0]!.seller).toBe("B");
    expect(ranked[1]!.deliveryKnown).toBe(false);
  });
});
