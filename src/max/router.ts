import { UserState, type User } from "@prisma/client";
import { z } from "zod";
import { ProcessedUpdateRepository } from "../db/repositories/processed-update.repository.js";
import { UserRepository } from "../db/repositories/user.repository.js";
import { UserFacingError, errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { MaxClient } from "./client.js";
import { FavoritesHandler } from "./handlers/favorites.js";
import { HistoryHandler } from "./handlers/history.js";
import { ProfileHandler } from "./handlers/profile.js";
import { SearchHandler } from "./handlers/search.js";
import { StartHandler } from "./handlers/start.js";
import { TrackingHandler } from "./handlers/tracking.js";
import { backToMenuKeyboard } from "./keyboards.js";
import { updateFingerprint, updateSchema, updateText, updateUser, type MaxUpdate } from "./types.js";

export type UpdateResult = "processed" | "duplicate" | "ignored" | "invalid";

export interface RouterHandlers {
  start: StartHandler;
  search: SearchHandler;
  tracking: TrackingHandler;
  history: HistoryHandler;
  profile: ProfileHandler;
  favorites: FavoritesHandler;
}

export class MaxRouter {
  constructor(
    private readonly client: MaxClient,
    private readonly handlers: RouterHandlers,
    private readonly users = new UserRepository(),
    private readonly processedUpdates = new ProcessedUpdateRepository(),
  ) {}

  async handle(rawUpdate: unknown): Promise<UpdateResult> {
    const parsed = updateSchema.safeParse(rawUpdate);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, "MAX прислал обновление неизвестного формата");
      return "invalid";
    }
    const update = parsed.data;
    if (!["bot_started", "message_created", "message_callback"].includes(update.update_type)) return "ignored";

    const actor = updateUser(update);
    if (!actor || actor.is_bot) return "ignored";

    const claimed = await this.processedUpdates.claim(updateFingerprint(update));
    if (!claimed) return "duplicate";

    const user = await this.users.ensure(actor.user_id, actor.username);
    try {
      if (update.update_type === "bot_started") {
        await this.handlers.start.handle(user, actor.name);
      } else if (update.update_type === "message_created") {
        await this.handleMessage(update, user);
      } else {
        await this.handleCallback(update, user);
      }
      return "processed";
    } catch (error) {
      logger.error(
        { updateType: update.update_type, maxUserId: actor.user_id, error: errorMessage(error) },
        "Ошибка обработки обновления MAX",
      );
      const message =
        error instanceof UserFacingError
          ? error.message
          : "Произошла временная ошибка. Попробуйте ещё раз через минуту.";
      await this.client.sendMessage(actor.user_id, `⚠️ ${message}`, backToMenuKeyboard()).catch((sendError) => {
        logger.error({ error: errorMessage(sendError) }, "Не удалось отправить сообщение об ошибке");
      });
      return "processed";
    }
  }

  private async handleMessage(update: MaxUpdate, user: User): Promise<void> {
    const text = updateText(update);
    if (!text) throw new UserFacingError("Отправьте название товара текстом.");
    const command = text.toLowerCase();

    if (["/start", "начать"].includes(command)) {
      await this.handlers.start.handle(user, updateUser(update)?.name);
      return;
    }
    if (["/menu", "меню"].includes(command)) {
      await this.handlers.start.menu(user);
      return;
    }

    if (user.state === UserState.WAITING_FOR_TARGET_PRICE) {
      await this.handlers.tracking.acceptPrice(user, text);
      return;
    }
    if (user.state === UserState.WAITING_FOR_CITY) {
      await this.handlers.profile.acceptCity(user, text);
      return;
    }
    if (user.state === UserState.WAITING_FOR_SEARCH || !command.startsWith("/")) {
      await this.handlers.search.execute(user, text);
      return;
    }

    throw new UserFacingError("Неизвестная команда. Нажмите «Главное меню».");
  }

  private async handleCallback(update: MaxUpdate, user: User): Promise<void> {
    const callback = update.callback;
    if (!callback) throw new UserFacingError("Некорректное нажатие кнопки.");
    await this.client.answerCallback(callback.callback_id);
    const payload = callback.payload ?? "";

    if (payload === "menu:home") return this.handlers.start.menu(user);
    if (payload === "menu:search") return this.handlers.search.prompt(user);
    if (payload === "menu:alerts") return this.handlers.tracking.list(user);
    if (payload === "menu:history") return this.handlers.history.overview(user);
    if (payload === "menu:favorites") return this.handlers.favorites.list(user);
    if (payload === "menu:profile") return this.handlers.profile.show(user);
    if (payload === "profile:city") return this.handlers.profile.promptCity(user);

    const action = z
      .object({ kind: z.enum(["track", "favorite", "history", "disable"]), id: z.string().min(1).max(64) })
      .safeParse(this.parseAction(payload));
    if (!action.success) throw new UserFacingError("Эта кнопка устарела. Откройте главное меню.");

    if (action.data.kind === "track") return this.handlers.tracking.begin(user, action.data.id);
    if (action.data.kind === "favorite") return this.handlers.favorites.toggle(user, action.data.id);
    if (action.data.kind === "history") return this.handlers.history.showProduct(user, action.data.id);
    return this.handlers.tracking.disable(user, action.data.id);
  }

  private parseAction(payload: string): Record<string, string> {
    const [scope, action, id] = payload.split(":");
    if (scope === "product" && action && id && ["track", "favorite", "history"].includes(action)) return { kind: action, id };
    if (scope === "alert" && action === "disable" && id) return { kind: "disable", id };
    return {};
  }
}
