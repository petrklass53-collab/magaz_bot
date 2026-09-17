import type { User } from "@prisma/client";
import { FavoriteRepository } from "../../db/repositories/favorite.repository.js";
import { ProductRepository } from "../../db/repositories/product.repository.js";
import { UserFacingError } from "../../utils/errors.js";
import { formatRubles } from "../../utils/money.js";
import { MaxClient } from "../client.js";
import { backToMenuKeyboard } from "../keyboards.js";
import { productTitle } from "../messages.js";
import type { MaxKeyboard } from "../types.js";

export class FavoritesHandler {
  constructor(
    private readonly client: MaxClient,
    private readonly favorites = new FavoriteRepository(),
    private readonly products = new ProductRepository(),
  ) {}

  async toggle(user: User, productId: string): Promise<void> {
    const product = await this.products.byId(productId);
    if (!product) throw new UserFacingError("Товар не найден.");
    const result = await this.favorites.toggle(user.id, productId);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      result === "added" ? `⭐ ${productTitle(product)} добавлен в избранное.` : `Товар удалён из избранного: ${productTitle(product)}.`,
      backToMenuKeyboard(),
    );
  }

  async list(user: User): Promise<void> {
    const favorites = await this.favorites.forUser(user.id);
    if (!favorites.length) {
      await this.client.sendMessage(user.maxUserId.toString(), "⭐ В избранном пока пусто.", backToMenuKeyboard());
      return;
    }
    const keyboard: MaxKeyboard = favorites.slice(0, 10).map((favorite) => [
      { type: "callback", text: `📊 ${productTitle(favorite.product)}`.slice(0, 128), payload: `product:history:${favorite.productId}` },
    ]);
    keyboard.push(...backToMenuKeyboard());
    const lines = favorites.slice(0, 10).map((favorite, index) => {
      const current = favorite.product.offers[0]?.totalPrice;
      return `${index + 1}. ${productTitle(favorite.product)}${current ? ` — от ${formatRubles(current)}` : ""}`;
    });
    await this.client.sendMessage(user.maxUserId.toString(), ["⭐ Избранное", "", ...lines].join("\n"), keyboard);
  }
}
