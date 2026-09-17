import { SubscriptionStatus, UserState, type User } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

describe("MAX Router", () => {
  it("выполняет действие кнопки, даже если MAX отклонил подтверждение callback", async () => {
    process.env.DATABASE_URL ??= "postgresql://pricehunter:pricehunter@127.0.0.1:5432/pricehunter";
    const { MaxRouter } = await import("../src/max/router.js");
    const user: User = {
      id: "user-1",
      maxUserId: 123n,
      username: "tester",
      createdAt: new Date(),
      updatedAt: new Date(),
      trialUntil: new Date(Date.now() + 86_400_000),
      subscriptionUntil: null,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      city: null,
      state: UserState.IDLE,
      stateData: null,
    };
    const menu = vi.fn().mockResolvedValue(undefined);
    const client = {
      answerCallback: vi.fn().mockRejectedValue(new Error("MAX rejected empty acknowledgement")),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };
    const router = new MaxRouter(
      client as never,
      {
        start: { menu } as never,
        search: {} as never,
        tracking: {} as never,
        history: {} as never,
        profile: {} as never,
        favorites: {} as never,
      },
      { ensure: vi.fn().mockResolvedValue(user) } as never,
      { claim: vi.fn().mockResolvedValue(true) } as never,
    );

    const result = await router.handle({
      update_type: "message_callback",
      timestamp: 1_789_603_200_000,
      callback: {
        callback_id: "callback-1",
        payload: "menu:home",
        user: { user_id: 123, name: "Тест" },
      },
    });

    expect(result).toBe("processed");
    expect(client.answerCallback).toHaveBeenCalledWith("callback-1");
    expect(menu).toHaveBeenCalledWith(user);
  });
});
