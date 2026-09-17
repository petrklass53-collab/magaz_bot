import { describe, expect, it } from "vitest";
import { shouldNotifyAlert } from "../src/core/alert.service.js";

describe("Alerts", () => {
  it("срабатывает при current <= target", () => {
    expect(shouldNotifyAlert({ currentPrice: 84_990, targetPrice: 85_000, lastNotifiedPrice: null })).toBe(true);
    expect(shouldNotifyAlert({ currentPrice: 85_001, targetPrice: 85_000, lastNotifiedPrice: null })).toBe(false);
  });

  it("не дублирует уведомление при той же цене", () => {
    expect(shouldNotifyAlert({ currentPrice: 84_990, targetPrice: 85_000, lastNotifiedPrice: 84_990 })).toBe(false);
    expect(shouldNotifyAlert({ currentPrice: 83_990, targetPrice: 85_000, lastNotifiedPrice: 84_990 })).toBe(true);
  });
});
