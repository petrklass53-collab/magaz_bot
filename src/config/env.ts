import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const ymlFeedSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z
    .string()
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Разрешены только HTTP(S) URL"),
});

const ymlFeedsFromJson = z
  .string()
  .default("[]")
  .transform((value, context): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Ожидается JSON-массив YML-лент" });
      return z.NEVER;
    }
  })
  .pipe(
    z.array(ymlFeedSchema).max(20).superRefine((feeds, context) => {
      const names = feeds.map((feed) => feed.name.toLocaleLowerCase("ru"));
      if (new Set(names).size !== names.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Названия YML-источников должны быть уникальными" });
      }
    }),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().min(1),
  MAX_BOT_TOKEN: z.string().default(""),
  MAX_API_BASE_URL: z.string().url().default("https://platform-api2.max.ru"),
  MAX_MODE: z.enum(["webhook", "polling"]).default("webhook"),
  MAX_WEBHOOK_URL: z.string().url().optional(),
  MAX_WEBHOOK_SECRET: z.string().min(5).max(256).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  TRIAL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  ALERT_CHECK_INTERVAL_MS: z.coerce.number().int().min(10_000).default(900_000),
  SOURCE_TIMEOUT_MS: z.coerce.number().int().min(500).max(60_000).default(5_000),
  ENABLE_DEMO_SOURCE: booleanFromString.default("true"),
  YML_FEEDS_JSON: ymlFeedsFromJson,
  YML_FEED_CACHE_TTL_MS: z.coerce.number().int().min(30_000).max(86_400_000).default(300_000),
  YML_FEED_MAX_BYTES: z.coerce.number().int().min(100_000).max(100_000_000).default(25_000_000),
  YML_SOURCE_MAX_OFFERS: z.coerce.number().int().min(1).max(1_000).default(200),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RUN_WORKER: booleanFromString.default("true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Некорректные переменные окружения: ${details}`);
}

export const env = parsed.data;

export function assertMaxConfigured(): void {
  if (!env.MAX_BOT_TOKEN) {
    throw new Error("MAX_BOT_TOKEN не задан");
  }
  if (env.NODE_ENV === "production" && env.MAX_MODE === "webhook") {
    if (!env.MAX_WEBHOOK_URL || env.MAX_WEBHOOK_URL.includes("your-domain.example")) {
      throw new Error("Для production webhook задайте реальный MAX_WEBHOOK_URL");
    }
    if (!env.MAX_WEBHOOK_SECRET || env.MAX_WEBHOOK_SECRET.startsWith("replace_with_")) {
      throw new Error("Для production webhook задайте собственный MAX_WEBHOOK_SECRET");
    }
  }
}
