import { totalPrice } from "../utils/money.js";
import type { Offer } from "../sources/source.interface.js";

export interface RankedOffer extends Offer {
  deliveryKnown: boolean;
  totalPrice: number;
  suspiciouslyCheap: boolean;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function rankOffers(offers: Offer[]): RankedOffer[] {
  const withTotals = offers.map((offer) => ({
    ...offer,
    deliveryKnown: offer.deliveryKnown ?? true,
    totalPrice: totalPrice(offer.price, offer.deliveryPrice, offer.mandatoryFees ?? 0),
  }));
  const knownTotals = withTotals.filter((offer) => offer.deliveryKnown).map((offer) => offer.totalPrice);
  const medianPrice = median(knownTotals.length ? knownTotals : withTotals.map((offer) => offer.totalPrice));

  return withTotals
    .map((offer) => ({
      ...offer,
      suspiciouslyCheap: medianPrice > 0 && offer.totalPrice < medianPrice * 0.6,
    }))
    .sort((a, b) => Number(b.deliveryKnown) - Number(a.deliveryKnown) || a.totalPrice - b.totalPrice);
}
