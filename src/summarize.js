import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SYSTEM_PROMPT = `你是一位專業的新聞編輯，負責將新聞整理成繁體中文摘要。

你的任務：
1. 閱讀提供的新聞列表（可能來自不同地區）
2. 為每則新聞撰寫簡潔的繁體中文摘要（2-3 句）
3. 在最後提供一段 3-5 句的整體趨勢分析

輸出格式（Markdown）：
- 每則新聞用 ### 標題，包含來源和地區
- 摘要內容直接列出
- 最後用 ## 趨勢分析 標題做總結
- 行文流暢自然，避免逐字翻譯

注意：不要使用破折號（—）連接子句，改用逗號或句號。`;

export async function summarizeNews(articles) {
  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] [${a.region}] ${a.title}\n來源: ${a.source}\n摘要: ${a.description}\n連結: ${a.url}`
    )
    .join("\n\n");

  const today = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const prompt = `${SYSTEM_PROMPT}

---
今天是 ${today}，請為以下 ${articles.length} 則新聞撰寫繁體中文摘要：

${articlesText}`;

  const tmpFile = join(tmpdir(), `news-prompt-${Date.now()}.txt`);
  try {
    writeFileSync(tmpFile, prompt, "utf8");
    const result = execSync(`claude --print < "${tmpFile}"`, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log("[Claude] Done via Claude Pro CLI");
    return result.toString().trim();
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}
