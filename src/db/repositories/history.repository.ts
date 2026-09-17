import { prisma } from "../client.js";

export interface ProductPriceStats {
  current: number | null;
  minimum: number | null;
  maximum: number | null;
  points: number;
}

export class HistoryRepository {
  async statsForProduct(productId: string): Promise<ProductPriceStats> {
    const [current, aggregate] = await Promise.all([
      prisma.offer.findFirst({ where: { productId }, orderBy: { totalPrice: "asc" } }),
      prisma.priceHistory.aggregate({
        where: { offer: { productId } },
        _min: { totalPrice: true },
        _max: { totalPrice: true },
        _count: { id: true },
      }),
    ]);

    return {
      current: current?.totalPrice ?? null,
      minimum: aggregate._min.totalPrice,
      maximum: aggregate._max.totalPrice,
      points: aggregate._count.id,
    };
  }
}
