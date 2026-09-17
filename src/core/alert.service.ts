export interface AlertDecisionInput {
  currentPrice: number;
  targetPrice: number;
  lastNotifiedPrice: number | null;
}

export function shouldNotifyAlert(input: AlertDecisionInput): boolean {
  if (input.currentPrice > input.targetPrice) return false;
  if (input.lastNotifiedPrice === null) return true;
  return input.currentPrice < input.lastNotifiedPrice;
}
