import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { MaxClient } from "./client.js";
import { MaxRouter } from "./router.js";

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MaxPoller {
  private stopped = false;
  private marker: string | number | null | undefined;

  constructor(
    private readonly client: MaxClient,
    private readonly router: MaxRouter,
  ) {}

  stop(): void {
    this.stopped = true;
  }

  async start(): Promise<void> {
    logger.warn("MAX Long Polling включён только для разработки; для production используйте Webhook");
    while (!this.stopped) {
      try {
        const response = await this.client.getUpdates(this.marker);
        for (const update of response.updates ?? []) await this.router.handle(update);
        this.marker = response.marker;
      } catch (error) {
        logger.error({ error: errorMessage(error) }, "Ошибка Long Polling");
        await sleep(2_000);
      }
    }
  }
}
