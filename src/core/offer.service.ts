import { OfferRepository } from "../db/repositories/offer.repository.js";
import type { RankedOffer } from "./price.service.js";

export class OfferService {
  constructor(private readonly offers = new OfferRepository()) {}

  async saveAll(productId: string, rankedOffers: RankedOffer[]): Promise<void> {
    await Promise.all(rankedOffers.map((offer) => this.offers.save(productId, offer)));
  }
}
