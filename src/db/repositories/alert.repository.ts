import type { PriceAlert } from "@prisma/client";
import { prisma } from "../client.js";

export class AlertRepository {
  async upsert(userId: string, productId: string, targetPrice: number): Promise<PriceAlert> {
    return prisma.priceAlert.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, targetPrice },
      update: { targetPrice, active: true, lastNotifiedAt: null, lastNotifiedPrice: null },
    });
  }

  async activeForUser(userId: string) {
    return prisma.priceAlert.findMany({
      where: { userId, active: true },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async activeForWorker() {
    return prisma.priceAlert.findMany({
      where: { active: true },
      include: { product: true, user: true },
      orderBy: { updatedAt: "asc" },
    });
  }

  async disable(id: string, userId?: string): Promise<boolean> {
    const result = await prisma.priceAlert.updateMany({
      where: { id, ...(userId ? { userId } : {}) },
      data: { active: false },
    });
    return result.count > 0;
  }

  async markNotified(id: string, price: number): Promise<void> {
    await prisma.priceAlert.update({
      where: { id },
      data: { lastNotifiedPrice: price, lastNotifiedAt: new Date() },
    });
  }
}
