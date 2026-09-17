import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const prisma = new PrismaClient({
  log:
    env.NODE_ENV === "development"
      ? [
          { emit: "event", level: "error" },
          { emit: "event", level: "warn" },
        ]
      : [{ emit: "event", level: "error" }],
});

prisma.$on("error", (event) => logger.error({ target: event.target }, event.message));
prisma.$on("warn", (event) => logger.warn({ target: event.target }, event.message));

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
