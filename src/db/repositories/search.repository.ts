import { prisma } from "../client.js";

export class SearchRepository {
  async record(userId: string, query: string): Promise<void> {
    await prisma.search.create({ data: { userId, query } });
  }
}
