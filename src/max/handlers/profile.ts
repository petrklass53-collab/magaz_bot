import type { User } from "@prisma/client";
import { UserState } from "@prisma/client";
import { UserRepository } from "../../db/repositories/user.repository.js";
import { UserFacingError } from "../../utils/errors.js";
import { MaxClient } from "../client.js";
import { backToMenuKeyboard } from "../keyboards.js";
import type { MaxKeyboard } from "../types.js";

export class ProfileHandler {
  constructor(
    private readonly client: MaxClient,
    private readonly users = new UserRepository(),
  ) {}

  async show(user: User): Promise<void> {
    const now = new Date();
    const status =
      user.subscriptionUntil && user.subscriptionUntil > now
        ? `Подписка активна до ${user.subscriptionUntil.toLocaleDateString("ru-RU")}`
        : user.trialUntil > now
          ? `Пробный период до ${user.trialUntil.toLocaleDateString("ru-RU")}`
          : "Пробный период завершён";
    const keyboard: MaxKeyboard = [
      [{ type: "callback", text: "📍 Изменить город", payload: "profile:city" }],
      ...backToMenuKeyboard(),
    ];
    await this.client.sendMessage(
      user.maxUserId.toString(),
      ["👤 Профиль", "", `Статус: ${status}`, `Город: ${user.city ?? "не указан"}`, "", "Текущий режим: DemoSource"].join("\n"),
      keyboard,
    );
  }

  async promptCity(user: User): Promise<void> {
    await this.users.setState(user.id, UserState.WAITING_FOR_CITY);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      "📍 Напишите ваш город. Он будет использоваться для расчёта доставки после подключения реальных источников.",
      backToMenuKeyboard(),
    );
  }

  async acceptCity(user: User, input: string): Promise<void> {
    const city = input.trim().replace(/\s+/g, " ");
    if (!/^[\p{L}\- .]{2,80}$/u.test(city)) {
      throw new UserFacingError("Укажите город буквами, например: Новосибирск.");
    }
    await this.users.setCity(user.id, city);
    await this.client.sendMessage(user.maxUserId.toString(), `✅ Город сохранён: ${city}`, backToMenuKeyboard());
  }
}
