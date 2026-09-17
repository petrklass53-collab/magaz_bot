import type { Product } from "@prisma/client";
import { shouldNotifyAlert } from "../core/alert.service.js";
import { SearchService } from "../core/search.service.js";
import { env } from "../config/env.js";
import { AlertRepository } from "../db/repositories/alert.repository.js";
import { ProcessedUpdateRepository } from "../db/repositories/processed-update.repository.js";
import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { formatRubles } from "../utils/money.js";
import { MaxClient } from "../max/client.js";
import { productTitle } from "../max/messages.js";

function queryForProduct(product: Product): string {
  return [product.brand, product.model, product.storage, product.variant, product.color].filter(Boolean).join(" ");
}

export class PriceAlertWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private lastCleanupAt = 0;

  constructor(
    private readonly client: MaxClient,
    private readonly searchService: SearchService,
    private readonly alerts = new AlertRepository(),
    private readonly processedUpdates = new ProcessedUpdateRepository(),
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runOnce(), env.ALERT_CHECK_INTERVAL_MS);
    this.timer.unref();
    logger.info({ intervalMs: env.ALERT_CHECK_INTERVAL_MS }, "Worker отслеживания цен запущен");
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const alerts = await this.alerts.activeForWorker();
      for (const alert of alerts) {
        try {
          const result = await this.searchService.search(queryForProduct(alert.product));
          const best = result.offers.find((offer) => offer.deliveryKnown);
          if (!best) continue;
          const notify = shouldNotifyAlert({
            currentPrice: best.totalPrice,
            targetPrice: alert.targetPrice,
            lastNotifiedPrice: alert.lastNotifiedPrice,
          });
          if (!notify) continue;

          await this.client.sendMessage(
            alert.user.maxUserId.toString(),
            [
              "🔥 Цена достигла цели!",
              "",
              `📱 ${productTitle(alert.product)}`,
              `Сейчас: ${formatRubles(best.totalPrice)}`,
              `Целевая цена: ${formatRubles(alert.targetPrice)}`,
              `🏪 ${best.seller}`,
              `🚚 Доставка: ${best.deliveryPrice === 0 ? "бесплатно" : formatRubles(best.deliveryPrice)}`,
            ].join("\n"),
            [[{ type: "link", text: "🛒 Открыть предложение", url: best.url }]],
          );
          await this.alerts.markNotified(alert.id, best.totalPrice);
        } catch (error) {
          logger.error({ alertId: alert.id, error: errorMessage(error) }, "Ошибка проверки PriceAlert");
        }
      }
      if (Date.now() - this.lastCleanupAt > 24 * 60 * 60 * 1_000) {
        await this.processedUpdates.deleteOlderThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000));
        this.lastCleanupAt = Date.now();
      }
    } finally {
      this.running = false;
    }
  }
}
