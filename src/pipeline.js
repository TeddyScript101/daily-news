import { fetchTopNews } from "./news.js";
import { summarizeNews } from "./summarize.js";
import { sendEmail } from "./email.js";

// Allow running directly: node src/pipeline.js
if (process.argv[1].endsWith("pipeline.js")) {
  runPipeline().catch((err) => { console.error(err); process.exit(1); });
}

export async function runPipeline() {
  const startTime = Date.now();
  console.log(`[Pipeline] Starting at ${new Date().toISOString()}`);

  const articles = await fetchTopNews();

  if (articles.length === 0) {
    console.log("[Pipeline] No articles fetched, skipping.");
    return;
  }

  const summary = await summarizeNews(articles);

  try {
    await sendEmail("每日新聞摘要", summary, articles);
  } catch (err) {
    console.error("[Email] Failed:", err.message);
  }

  console.log(`[Pipeline] Done in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}
