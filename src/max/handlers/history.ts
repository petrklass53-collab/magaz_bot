import type { User } from "@prisma/client";
import { HistoryRepository } from "../../db/repositories/history.repository.js";
import { ProductRepository } from "../../db/repositories/product.repository.js";
import { UserFacingError } from "../../utils/errors.js";
import { formatRubles } from "../../utils/money.js";
import { MaxClient } from "../client.js";
import { backToMenuKeyboard } from "../keyboards.js";
import { productTitle } from "../messages.js";

export class HistoryHandler {
  constructor(
    private readonly client: MaxClient,
    private readonly history = new HistoryRepository(),
    private readonly products = new ProductRepository(),
  ) {}

  async overview(user: User): Promise<void> {
    await this.client.sendMessage(
      user.maxUserId.toString(),
      "📊 История цен собирается после каждого обновления предложения.\n\nЧтобы посмотреть минимум и максимум конкретного товара, откройте его из поиска или избранного и нажмите «История цены».",
      backToMenuKeyboard(),
    );
  }

  async showProduct(user: User, productId: string): Promise<void> {
    const product = await this.products.byId(productId);
    if (!product) throw new UserFacingError("Товар не найден.");
    const stats = await this.history.statsForProduct(productId);
    const value = (price: number | null) => (price === null ? "нет данных" : formatRubles(price));
    await this.client.sendMessage(
      user.maxUserId.toString(),
      [
        `📊 История цены: ${productTitle(product)}`,
        "",
        `Цена сейчас: ${value(stats.current)}`,
        `Минимум: ${value(stats.minimum)}`,
        `Максимум: ${value(stats.maximum)}`,
        `Зафиксировано изменений: ${stats.points}`,
      ].join("\n"),
      backToMenuKeyboard(),
    );
  }
}
