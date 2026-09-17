export function totalPrice(price: number, deliveryPrice = 0, mandatoryFees = 0): number {
  return Math.max(0, Math.round(price + deliveryPrice + mandatoryFees));
}

export function formatRubles(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

export function parseRubles(input: string): number | null {
  const cleaned = input
    .toLowerCase()
    .replace(/руб(?:лей|ля|ль)?/gu, "")
    .replace(/₽|р\.?/gu, "")
    .trim();
  if (!/^[\d\s.,]+$/.test(cleaned)) return null;
  const normalized = cleaned.replace(/[^\d]/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000_000) return null;
  return value;
}
