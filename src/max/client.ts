import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { MaxKeyboard, MaxUpdatesResponse } from "./types.js";

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MaxClient {
  private readonly http: AxiosInstance;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly lastSentAt = new Map<string, number>();
  private apiQueue: Promise<void> = Promise.resolve();
  private globalLastRequestAt = 0;

  constructor(token = env.MAX_BOT_TOKEN, baseURL = env.MAX_API_BASE_URL) {
    this.http = axios.create({
      baseURL,
      timeout: 15_000,
      headers: { Authorization: token, "Content-Type": "application/json" },
    });
  }

  async sendMessage(userId: string, text: string, keyboard?: MaxKeyboard): Promise<void> {
    await this.enqueue(userId, async () => {
      const body: Record<string, unknown> = { text: text.slice(0, 4_000), notify: true };
      if (keyboard?.length) {
        body.attachments = [{ type: "inline_keyboard", payload: { buttons: keyboard } }];
      }
      await this.request({ method: "POST", url: "/messages", params: { user_id: userId }, data: body });
    });
  }

  async answerCallback(callbackId: string): Promise<void> {
    await this.request({ method: "POST", url: "/answers", params: { callback_id: callbackId }, data: {} });
  }

  async getUpdates(marker?: string | number | null): Promise<MaxUpdatesResponse> {
    const response = await this.request<MaxUpdatesResponse>({
      method: "GET",
      url: "/updates",
      params: {
        limit: 100,
        timeout: 30,
        types: "bot_started,message_created,message_callback",
        ...(marker !== undefined && marker !== null ? { marker } : {}),
      },
      timeout: 40_000,
    });
    return response.data;
  }

  async subscribeWebhook(url: string, secret?: string): Promise<void> {
    await this.request({
      method: "POST",
      url: "/subscriptions",
      data: {
        url,
        update_types: ["bot_started", "message_created", "message_callback"],
        ...(secret ? { secret } : {}),
      },
    });
  }

  private async enqueue(key: string, task: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        const waitFor = Math.max(0, (this.lastSentAt.get(key) ?? 0) + 520 - Date.now());
        if (waitFor > 0) await sleep(waitFor);
        await task();
        this.lastSentAt.set(key, Date.now());
      });
    this.queues.set(key, current);
    try {
      await current;
    } finally {
      if (this.queues.get(key) === current) this.queues.delete(key);
    }
  }

  private async request<T = unknown>(config: AxiosRequestConfig, attempt = 0): Promise<AxiosResponse<T>> {
    await this.waitForGlobalSlot();
    try {
      return await this.http.request<T>(config);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const retryable = status === 429 || status === 503 || (status !== undefined && status >= 500);
      if (retryable && attempt < 2) {
        const retryAfter = Number(axiosError.response?.headers["retry-after"] ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1_000 : 500 * 2 ** attempt;
        await sleep(delay);
        return this.request<T>(config, attempt + 1);
      }
      logger.error({ status, method: config.method, url: config.url }, "Ошибка MAX API");
      throw error;
    }
  }

  private async waitForGlobalSlot(): Promise<void> {
    const slot = this.apiQueue
      .catch(() => undefined)
      .then(async () => {
        const waitFor = Math.max(0, this.globalLastRequestAt + 34 - Date.now());
        if (waitFor > 0) await sleep(waitFor);
        this.globalLastRequestAt = Date.now();
      });
    this.apiQueue = slot;
    await slot;
  }
}
