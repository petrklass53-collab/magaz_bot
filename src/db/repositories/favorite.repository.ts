import { prisma } from "../client.js";

export class FavoriteRepository {
  async toggle(userId: string, productId: string): Promise<"added" | "removed"> {
    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return "removed";
    }
    await prisma.favorite.create({ data: { userId, productId } });
    return "added";
  }

  async forUser(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      include: { product: { include: { offers: { orderBy: { totalPrice: "asc" }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
