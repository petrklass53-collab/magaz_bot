import { z } from "zod";

const idSchema = z.union([z.string(), z.number(), z.bigint()]).transform(String);

export const maxUserSchema = z
  .object({
    user_id: idSchema,
    username: z.string().optional(),
    name: z.string().optional(),
    is_bot: z.boolean().optional(),
  })
  .passthrough();

const messageSchema = z
  .object({
    sender: maxUserSchema.optional(),
    recipient: z
      .object({
        chat_id: idSchema.optional(),
        user_id: idSchema.optional(),
        chat_type: z.string().optional(),
      })
      .passthrough()
      .optional(),
    body: z
      .object({
        mid: z.string().optional(),
        text: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const callbackSchema = z
  .object({
    callback_id: z.string(),
    payload: z.string().optional(),
    user: maxUserSchema.optional(),
    message: messageSchema.optional(),
  })
  .passthrough();

export const updateSchema = z
  .object({
    update_type: z.enum([
      "bot_started",
      "bot_stopped",
      "message_created",
      "message_callback",
      "message_edited",
      "message_removed",
      "bot_added",
      "bot_removed",
    ]),
    timestamp: z.union([z.string(), z.number()]).optional(),
    chat_id: idSchema.optional(),
    user: maxUserSchema.optional(),
    message: messageSchema.optional(),
    callback: callbackSchema.optional(),
  })
  .passthrough();

export type MaxUpdate = z.infer<typeof updateSchema>;
export type MaxUser = z.infer<typeof maxUserSchema>;

export interface CallbackButton {
  type: "callback";
  text: string;
  payload: string;
  intent?: "default" | "positive" | "negative";
}

export interface LinkButton {
  type: "link";
  text: string;
  url: string;
}

export interface MessageButton {
  type: "message";
  text: string;
  payload: string;
}

export type MaxButton = CallbackButton | LinkButton | MessageButton;
export type MaxKeyboard = MaxButton[][];

export interface MaxUpdatesResponse {
  updates: unknown[];
  marker?: string | number | null;
}

export function updateUser(update: MaxUpdate): MaxUser | null {
  return update.callback?.user ?? update.message?.sender ?? update.user ?? null;
}

export function updateText(update: MaxUpdate): string | null {
  return update.message?.body?.text?.trim() || null;
}

export function updateFingerprint(update: MaxUpdate): string {
  const actor = updateUser(update)?.user_id ?? "unknown";
  const eventId = update.message?.body?.mid ?? update.callback?.callback_id;
  return eventId ? `${update.update_type}:${eventId}` : `${update.update_type}:${actor}:${update.timestamp ?? "unknown"}`;
}
