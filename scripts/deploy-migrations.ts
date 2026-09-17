import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { env } from "../src/config/env.js";

const lockId = 741_285_019;
const migrationsDirectory = path.resolve(process.cwd(), "prisma", "migrations");
const client = new Client({ connectionString: env.DATABASE_URL });

async function deploy(): Promise<void> {
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [lockId]);
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_pricehunter_migrations" (
        "id" TEXT PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const entries = await readdir(migrationsDirectory, { withFileTypes: true });
    const migrations = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    for (const id of migrations) {
      const sql = await readFile(path.join(migrationsDirectory, id, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        'SELECT "checksum" FROM "_pricehunter_migrations" WHERE "id" = $1',
        [id],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Миграция ${id} уже применена, но её контрольная сумма изменилась`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_pricehunter_migrations" ("id", "checksum") VALUES ($1, $2)',
          [id, checksum],
        );
        await client.query("COMMIT");
        process.stdout.write(`Применена миграция: ${id}\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    process.stdout.write("Миграции базы данных актуальны\n");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [lockId]).catch(() => undefined);
    await client.end();
  }
}

deploy().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Ошибка миграции: ${message}\n`);
  process.exit(1);
});
