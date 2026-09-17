import { prisma } from "../client.js";

export interface ProductPriceStats {
  current: number | null;
  minimum: number | null;
  maximum: number | null;
  points: number;
  dailyMinimums: Array<{ day: Date; totalPrice: number }>;
}

export class HistoryRepository {
  async statsForProduct(productId: string): Promise<ProductPriceStats> {
    const [current, aggregate, recent] = await Promise.all([
      prisma.offer.findFirst({
        where: { productId, deliveryKnown: true, availability: { not: "out_of_stock" } },
        orderBy: { totalPrice: "asc" },
      }),
      prisma.priceHistory.aggregate({
        where: { offer: { productId }, deliveryKnown: true },
        _min: { totalPrice: true },
        _max: { totalPrice: true },
        _count: { id: true },
      }),
      prisma.priceHistory.findMany({
        where: { offer: { productId }, deliveryKnown: true },
        select: { totalPrice: true, recordedAt: true },
        orderBy: { recordedAt: "desc" },
        take: 500,
      }),
    ]);

    const minimumByDay = new Map<string, { day: Date; totalPrice: number }>();
    for (const point of recent) {
      const key = point.recordedAt.toISOString().slice(0, 10);
      const existing = minimumByDay.get(key);
      if (!existing || point.totalPrice < existing.totalPrice) {
        minimumByDay.set(key, { day: point.recordedAt, totalPrice: point.totalPrice });
      }
    }
    const dailyMinimums = [...minimumByDay.values()]
      .sort((left, right) => left.day.getTime() - right.day.getTime())
      .slice(-14);

    return {
      current: current?.totalPrice ?? null,
      minimum: aggregate._min.totalPrice,
      maximum: aggregate._max.totalPrice,
      points: aggregate._count.id,
      dailyMinimums,
    };
  }
}
