import type { Product } from "@prisma/client";
import { SearchRepository } from "../db/repositories/search.repository.js";
import { normalizeProductQuery } from "../normalizer/normalizer.js";
import { SourceRegistry } from "../sources/source.registry.js";
import { UserFacingError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { matchOfferTitle } from "./matching.service.js";
import { OfferService } from "./offer.service.js";
import { rankOffers, type RankedOffer } from "./price.service.js";
import { ProductService } from "./product.service.js";

export interface SearchResult {
  product: Product;
  offers: RankedOffer[];
  failedSources: string[];
}

export class SearchService {
  constructor(
    private readonly sources: SourceRegistry,
    private readonly products = new ProductService(),
    private readonly offers = new OfferService(),
    private readonly searches = new SearchRepository(),
  ) {}

  async search(rawQuery: string, userId?: string): Promise<SearchResult> {
    const queryText = rawQuery.trim().slice(0, 200);
    if (queryText.length < 3) throw new UserFacingError("Введите название товара подробнее — минимум 3 символа.");

    const startedAt = Date.now();
    const normalized = normalizeProductQuery(queryText);
    const sourceResult = await this.sources.searchAll(normalized);
    const matchingOffers = sourceResult.offers.filter(
      (offer) => this.isValidOffer(offer) && matchOfferTitle(normalized, offer.title).matches,
    );
    const ranked = rankOffers(matchingOffers);
    const product = await this.products.save(normalized);

    await Promise.all([
      this.offers.saveAll(product.id, ranked),
      userId ? this.searches.record(userId, queryText) : Promise.resolve(),
    ]);

    logger.info(
      {
        query: queryText,
        normalizedName: normalized.normalizedName,
        offers: ranked.length,
        failedSources: sourceResult.failedSources,
        durationMs: Date.now() - startedAt,
      },
      "Поиск завершён",
    );

    return { product, offers: ranked, failedSources: sourceResult.failedSources };
  }

  private isValidOffer(offer: { title: string; price: number; deliveryPrice: number; mandatoryFees?: number; url: string }): boolean {
    const amounts = [offer.price, offer.deliveryPrice, offer.mandatoryFees ?? 0];
    if (!offer.title.trim() || amounts.some((value) => !Number.isFinite(value) || value < 0 || value > 100_000_000)) return false;
    try {
      const url = new URL(offer.url);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }
}
