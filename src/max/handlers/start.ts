import type { User } from "@prisma/client";
import { UserState } from "@prisma/client";
import { UserRepository } from "../../db/repositories/user.repository.js";
import { MaxClient } from "../client.js";
import { mainMenuKeyboard } from "../keyboards.js";
import { welcomeMessage } from "../messages.js";

export class StartHandler {
  constructor(
    private readonly client: MaxClient,
    private readonly users = new UserRepository(),
  ) {}

  async handle(user: User, displayName?: string): Promise<void> {
    await this.users.setState(user.id, UserState.IDLE);
    await this.client.sendMessage(user.maxUserId.toString(), welcomeMessage(displayName), mainMenuKeyboard());
  }

  async menu(user: User): Promise<void> {
    await this.users.setState(user.id, UserState.IDLE);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      "🏠 Главное меню PriceHunter\n\nЧто хотите сделать?",
      mainMenuKeyboard(),
    );
  }
}
