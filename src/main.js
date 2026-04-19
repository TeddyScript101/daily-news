import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cron from "node-cron";
import { runPipeline } from "./pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const schedule = process.env.CRON_SCHEDULE ?? "0 8 * * *";
const timezone = process.env.TIMEZONE ?? "Asia/Taipei";

console.log(`[Cron] Scheduling "${schedule}" (${timezone})`);

cron.schedule(schedule, runPipeline, { timezone });

console.log("[Cron] Scheduler running. Press Ctrl+C to stop.");
console.log("[Cron] Run `node src/main.js --now` to trigger immediately.");

if (process.argv.includes("--now")) {
  console.log("[Cron] --now flag detected, running pipeline immediately...");
  runPipeline().catch(console.error);
}
