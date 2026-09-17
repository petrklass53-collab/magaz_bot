import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";

export class ProcessedUpdateRepository {
  async claim(id: string): Promise<boolean> {
    try {
      await prisma.processedUpdate.create({ data: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await prisma.processedUpdate.deleteMany({ where: { processedAt: { lt: date } } });
    return result.count;
  }
}
