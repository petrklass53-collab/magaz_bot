import { env } from "../config/env.js";
import type { ProductQuery } from "../normalizer/normalizer.js";
import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { Offer, SourceAdapter } from "./source.interface.js";

export interface SourceSearchResult {
  offers: Offer[];
  failedSources: string[];
}

export class SourceRegistry {
  private readonly sources = new Map<string, SourceAdapter>();

  register(source: SourceAdapter): this {
    if (this.sources.has(source.name)) throw new Error(`Источник ${source.name} уже зарегистрирован`);
    this.sources.set(source.name, source);
    return this;
  }

  list(): string[] {
    return [...this.sources.keys()];
  }

  async searchAll(query: ProductQuery): Promise<SourceSearchResult> {
    const tasks = [...this.sources.values()].map(async (source) => {
      let timeout: NodeJS.Timeout | undefined;
      try {
        const timer = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`Тайм-аут источника ${source.name}`)), env.SOURCE_TIMEOUT_MS);
          timeout.unref();
        });
        const offers = await Promise.race([source.search(query), timer]);
        return { source: source.name, offers };
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    });

    const settled = await Promise.allSettled(tasks);
    const offers: Offer[] = [];
    const failedSources: string[] = [];

    for (const [index, result] of settled.entries()) {
      const sourceName = [...this.sources.keys()][index] ?? "unknown";
      if (result.status === "fulfilled") offers.push(...result.value.offers);
      else {
        failedSources.push(sourceName);
        logger.warn({ source: sourceName, error: errorMessage(result.reason) }, "Источник цен недоступен");
      }
    }

    return { offers, failedSources };
  }
}
