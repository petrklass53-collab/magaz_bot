import type { Product } from "@prisma/client";
import type { ProductQuery } from "../../normalizer/normalizer.js";
import { prisma } from "../client.js";

export class ProductRepository {
  async upsert(query: ProductQuery): Promise<Product> {
    return prisma.product.upsert({
      where: { normalizedName: query.normalizedName },
      create: {
        brand: query.brand,
        model: query.model,
        category: query.category,
        variant: query.variant,
        storage: query.storage,
        color: query.color,
        normalizedName: query.normalizedName,
      },
      update: {
        brand: query.brand,
        model: query.model,
        category: query.category,
        variant: query.variant,
        storage: query.storage,
        color: query.color,
      },
    });
  }

  async byId(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }
}
