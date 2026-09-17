import { prisma } from "../client.js";

export class ProcessedUpdateRepository {
  async claim(id: string): Promise<boolean> {
    const result = await prisma.processedUpdate.createMany({
      data: [{ id }],
      skipDuplicates: true,
    });
    return result.count === 1;
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await prisma.processedUpdate.deleteMany({ where: { processedAt: { lt: date } } });
    return result.count;
  }
}
