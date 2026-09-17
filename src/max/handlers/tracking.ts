import type { Product, User } from "@prisma/client";
import { UserState } from "@prisma/client";
import { AlertRepository } from "../../db/repositories/alert.repository.js";
import { ProductRepository } from "../../db/repositories/product.repository.js";
import { UserRepository } from "../../db/repositories/user.repository.js";
import { UserFacingError } from "../../utils/errors.js";
import { formatRubles, parseRubles } from "../../utils/money.js";
import { MaxClient } from "../client.js";
import { backToMenuKeyboard } from "../keyboards.js";
import { productTitle } from "../messages.js";
import type { MaxKeyboard } from "../types.js";

export class TrackingHandler {
  constructor(
    private readonly client: MaxClient,
    private readonly alerts = new AlertRepository(),
    private readonly users = new UserRepository(),
    private readonly products = new ProductRepository(),
  ) {}

  async begin(user: User, productId: string): Promise<void> {
    const product = await this.products.byId(productId);
    if (!product) throw new UserFacingError("Товар не найден. Выполните поиск ещё раз.");
    await this.users.setState(user.id, UserState.WAITING_FOR_TARGET_PRICE, { productId });
    await this.client.sendMessage(
      user.maxUserId.toString(),
      `📉 До какой итоговой цены отслеживать ${productTitle(product)}?\n\nВведите сумму в рублях, например: 85000`,
      backToMenuKeyboard(),
    );
  }

  async acceptPrice(user: User, input: string): Promise<void> {
    const targetPrice = parseRubles(input);
    if (!targetPrice) throw new UserFacingError("Не удалось распознать цену. Введите сумму цифрами, например: 85000.");
    const productId = this.productIdFromState(user.stateData);
    if (!productId) {
      await this.users.setState(user.id, UserState.IDLE);
      throw new UserFacingError("Контекст отслеживания устарел. Найдите товар и нажмите «Следить» ещё раз.");
    }
    const product = await this.products.byId(productId);
    if (!product) throw new UserFacingError("Товар больше не найден.");

    await this.alerts.upsert(user.id, productId, targetPrice);
    await this.users.setState(user.id, UserState.IDLE);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      `✅ Отслеживание включено!\n\n${productTitle(product)}\nЦелевая цена: ${formatRubles(targetPrice)}\n\nЯ сообщу, когда итоговая цена станет не выше цели.`,
      backToMenuKeyboard(),
    );
  }

  async list(user: User): Promise<void> {
    const alerts = await this.alerts.activeForUser(user.id);
    if (!alerts.length) {
      await this.client.sendMessage(
        user.maxUserId.toString(),
        "📉 Активных отслеживаний пока нет. Найдите товар и нажмите «Следить».",
        backToMenuKeyboard(),
      );
      return;
    }

    const keyboard: MaxKeyboard = alerts.slice(0, 10).map((alert) => [
      { type: "callback", text: `⛔ Отключить: ${productTitle(alert.product)}`.slice(0, 128), payload: `alert:disable:${alert.id}`, intent: "negative" },
    ]);
    keyboard.push(...backToMenuKeyboard());
    const text = [
      "📉 Мои отслеживания",
      "",
      ...alerts.slice(0, 10).map(
        (alert, index) => `${index + 1}. ${productTitle(alert.product)} — цель ${formatRubles(alert.targetPrice)}`,
      ),
    ].join("\n");
    await this.client.sendMessage(user.maxUserId.toString(), text, keyboard);
  }

  async disable(user: User, alertId: string): Promise<void> {
    const disabled = await this.alerts.disable(alertId, user.id);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      disabled ? "✅ Отслеживание отключено." : "Отслеживание уже отключено или не найдено.",
      backToMenuKeyboard(),
    );
  }

  private productIdFromState(stateData: unknown): string | null {
    if (!stateData || typeof stateData !== "object" || Array.isArray(stateData)) return null;
    const value = (stateData as Record<string, unknown>).productId;
    return typeof value === "string" ? value : null;
  }
}
