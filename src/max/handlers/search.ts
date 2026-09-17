import type { User } from "@prisma/client";
import { UserState } from "@prisma/client";
import { SearchService } from "../../core/search.service.js";
import { UserRepository } from "../../db/repositories/user.repository.js";
import { MaxClient } from "../client.js";
import { backToMenuKeyboard, productKeyboard } from "../keyboards.js";
import { formatSearchResult } from "../messages.js";

function safeOfferLinks(offers: Array<{ seller: string; url: string }>): Array<{ seller: string; url: string }> {
  return offers.filter((offer) => {
    try {
      const url = new URL(offer.url);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  });
}

export class SearchHandler {
  constructor(
    private readonly client: MaxClient,
    private readonly searchService: SearchService,
    private readonly users = new UserRepository(),
  ) {}

  async prompt(user: User): Promise<void> {
    await this.users.setState(user.id, UserState.WAITING_FOR_SEARCH);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      "🔎 Отправьте полное название товара.\n\nНапример: iPhone 16 Pro 256GB",
      backToMenuKeyboard(),
    );
  }

  async execute(user: User, query: string): Promise<void> {
    await this.client.sendMessage(user.maxUserId.toString(), "🔎 Ищу лучшие предложения…");
    const result = await this.searchService.search(query, user.id);
    await this.users.setState(user.id, UserState.IDLE);
    await this.client.sendMessage(
      user.maxUserId.toString(),
      formatSearchResult(result),
      result.offers.length
        ? productKeyboard(result.product.id, safeOfferLinks(result.offers))
        : backToMenuKeyboard(),
    );
  }
}
