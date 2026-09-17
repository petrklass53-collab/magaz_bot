import type { Product } from "@prisma/client";
import { ProductRepository } from "../db/repositories/product.repository.js";
import { normalizeProductQuery, type ProductQuery } from "../normalizer/normalizer.js";

export class ProductService {
  constructor(private readonly products = new ProductRepository()) {}

  normalize(query: string): ProductQuery {
    return normalizeProductQuery(query);
  }

  save(query: ProductQuery): Promise<Product> {
    return this.products.upsert(query);
  }

  byId(id: string): Promise<Product | null> {
    return this.products.byId(id);
  }
}
