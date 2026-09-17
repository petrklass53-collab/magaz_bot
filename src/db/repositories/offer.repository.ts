import type { Offer as DbOffer } from "@prisma/client";
import type { RankedOffer } from "../../core/price.service.js";
import { prisma } from "../client.js";

export class OfferRepository {
  async save(productId: string, offer: RankedOffer): Promise<DbOffer> {
    const previous = await prisma.offer.findUnique({
      where: { source_url: { source: offer.source, url: offer.url } },
    });

    const saved = await prisma.offer.upsert({
      where: { source_url: { source: offer.source, url: offer.url } },
      create: {
        productId,
        source: offer.source,
        seller: offer.seller,
        title: offer.title,
        price: offer.price,
        deliveryPrice: offer.deliveryPrice,
        deliveryKnown: offer.deliveryKnown,
        mandatoryFees: offer.mandatoryFees ?? 0,
        totalPrice: offer.totalPrice,
        currency: offer.currency,
        availability: offer.availability,
        url: offer.url,
      },
      update: {
        productId,
        seller: offer.seller,
        title: offer.title,
        price: offer.price,
        deliveryPrice: offer.deliveryPrice,
        deliveryKnown: offer.deliveryKnown,
        mandatoryFees: offer.mandatoryFees ?? 0,
        totalPrice: offer.totalPrice,
        currency: offer.currency,
        availability: offer.availability,
      },
    });

    const changed =
      !previous ||
      previous.price !== saved.price ||
      previous.deliveryPrice !== saved.deliveryPrice ||
      previous.deliveryKnown !== saved.deliveryKnown ||
      previous.mandatoryFees !== saved.mandatoryFees ||
      previous.totalPrice !== saved.totalPrice;

    if (changed) {
      await prisma.priceHistory.create({
        data: {
          offerId: saved.id,
          price: saved.price,
          deliveryPrice: saved.deliveryPrice,
          deliveryKnown: saved.deliveryKnown,
          mandatoryFees: saved.mandatoryFees,
          totalPrice: saved.totalPrice,
        },
      });
    }

    return saved;
  }

  async currentForProduct(productId: string): Promise<DbOffer[]> {
    return prisma.offer.findMany({
      where: { productId, availability: { not: "out_of_stock" } },
      orderBy: [{ deliveryKnown: "desc" }, { totalPrice: "asc" }],
    });
  }
}
