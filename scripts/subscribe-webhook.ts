import { env, assertMaxConfigured } from "../src/config/env.js";
import { MaxClient } from "../src/max/client.js";

assertMaxConfigured();
if (!env.MAX_WEBHOOK_URL) throw new Error("MAX_WEBHOOK_URL не задан");

const client = new MaxClient();
await client.subscribeWebhook(env.MAX_WEBHOOK_URL, env.MAX_WEBHOOK_SECRET);
process.stdout.write(`Webhook MAX подключён: ${env.MAX_WEBHOOK_URL}\n`);
