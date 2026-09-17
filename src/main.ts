import { timingSafeEqual } from "node:crypto";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { assertMaxConfigured, env } from "./config/env.js";
import { SearchService } from "./core/search.service.js";
import { disconnectDatabase, prisma } from "./db/client.js";
import { MaxClient } from "./max/client.js";
import { FavoritesHandler } from "./max/handlers/favorites.js";
import { HistoryHandler } from "./max/handlers/history.js";
import { ProfileHandler } from "./max/handlers/profile.js";
import { SearchHandler } from "./max/handlers/search.js";
import { StartHandler } from "./max/handlers/start.js";
import { TrackingHandler } from "./max/handlers/tracking.js";
import { MaxPoller } from "./max/poller.js";
import { MaxRouter } from "./max/router.js";
import { DemoSource } from "./sources/demo/demo.source.js";
import { SourceRegistry } from "./sources/source.registry.js";
import { YmlFeedSource } from "./sources/yml/yml-feed.source.js";
import { errorMessage } from "./utils/errors.js";
import { logger } from "./utils/logger.js";
import { PriceAlertWorker } from "./worker/price-alert.worker.js";

function safeSecretMatches(received: string | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function bootstrap(): Promise<void> {
  assertMaxConfigured();
  await prisma.$connect();

  const sourceRegistry = new SourceRegistry();
  if (env.ENABLE_DEMO_SOURCE) sourceRegistry.register(new DemoSource());
  for (const feed of env.YML_FEEDS_JSON) {
    sourceRegistry.register(
      new YmlFeedSource({
        ...feed,
        cacheTtlMs: env.YML_FEED_CACHE_TTL_MS,
        maxBytes: env.YML_FEED_MAX_BYTES,
        maxSearchOffers: env.YML_SOURCE_MAX_OFFERS,
        timeoutMs: env.SOURCE_TIMEOUT_MS,
      }),
    );
  }
  if (sourceRegistry.list().length === 0) {
    logger.warn("Источники цен не настроены: бот запустится, но поиск не вернёт предложений");
  }
  const searchService = new SearchService(sourceRegistry);
  const client = new MaxClient();
  const router = new MaxRouter(client, {
    start: new StartHandler(client),
    search: new SearchHandler(client, searchService),
    tracking: new TrackingHandler(client),
    history: new HistoryHandler(client),
    profile: new ProfileHandler(client),
    favorites: new FavoritesHandler(client),
  });
  const worker = new PriceAlertWorker(client, searchService);
  if (env.RUN_WORKER) worker.start();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "256kb", type: ["application/json", "application/*+json"] }));
  app.use(rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: "draft-8", legacyHeaders: false }));

  app.get("/health", async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.status(200).json({ status: "ok", service: "PriceHunter", sources: sourceRegistry.list() });
    } catch {
      response.status(503).json({ status: "unhealthy" });
    }
  });

  app.post("/webhook", async (request, response) => {
    const receivedSecret = request.header("X-Max-Bot-Api-Secret");
    if (!safeSecretMatches(receivedSecret, env.MAX_WEBHOOK_SECRET)) {
      response.status(401).json({ ok: false });
      return;
    }
    try {
      const result = await router.handle(request.body);
      response.status(result === "invalid" ? 400 : 200).json({ ok: result !== "invalid", result });
    } catch (error) {
      logger.error({ error: errorMessage(error) }, "Webhook не обработан");
      response.status(500).json({ ok: false });
    }
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const candidate = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, maxMode: env.MAX_MODE, sources: sourceRegistry.list() },
        "PriceHunter запущен",
      );
      resolve(candidate);
    });
    candidate.once("error", reject);
  });

  if (env.AUTO_REGISTER_WEBHOOK && env.MAX_MODE === "webhook") {
    await client.subscribeWebhook(env.MAX_WEBHOOK_URL!, env.MAX_WEBHOOK_SECRET);
    logger.info("Webhook MAX зарегистрирован автоматически");
  }

  const poller = env.MAX_MODE === "polling" ? new MaxPoller(client, router) : null;
  if (poller) void poller.start();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Завершение PriceHunter");
    poller?.stop();
    worker.stop();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  logger.fatal({ error: errorMessage(error) }, "PriceHunter не запустился");
  process.exit(1);
});
