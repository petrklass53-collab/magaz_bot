import { describe, expect, it } from "vitest";
import { updateFingerprint, updateSchema, updateUser } from "../src/max/types.js";

describe("MAX Update", () => {
  it("принимает официальный message_created и безопасно приводит int64 ID к строке", () => {
    const update = updateSchema.parse({
      update_type: "message_created",
      timestamp: 1_789_603_200_000,
      message: {
        sender: { user_id: 123456789, name: "Тест" },
        recipient: { chat_id: 987654321, chat_type: "dialog" },
        body: { mid: "mid.123", text: "iPhone 16 Pro 256GB" },
      },
    });
    expect(updateUser(update)?.user_id).toBe("123456789");
    expect(updateFingerprint(update)).toBe("message_created:mid.123");
  });

  it("отклоняет неизвестный тип события", () => {
    expect(updateSchema.safeParse({ update_type: "invented_event" }).success).toBe(false);
  });
});
