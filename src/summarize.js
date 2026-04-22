import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `你是一位專業的新聞編輯，負責將新聞整理成繁體中文摘要。

你的任務：
1. 閱讀提供的新聞列表
2. 為每則新聞撰寫簡潔的繁體中文摘要（2-3 句）
3. 在最後提供一段 3-5 句的整體趨勢分析

輸出格式（Markdown）：
- 每則新聞必須依下列嚴格格式輸出：
### [地區] 標題
來源：新聞來源

(摘要內容)

- 最後用 ## 趨勢分析 標題做總結
- 行文流暢自然，避免逐字翻譯

注意：不要使用破折號（—）連接子句，改用逗號或句號。`;

export async function summarizeNews(articles) {
  // 在函式內部初始化，確保 process.env 已經被 main.js 載入
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] [${a.region}] ${a.title}\n來源: ${a.source}\n摘要: ${a.description}\n連結: ${a.url}`
    )
    .join("\n\n");

  const today = new Date().toLocaleDateString("zh-TW", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const promptText = `${SYSTEM_PROMPT}

---
今天是 ${today}，請為以下 ${articles.length} 則新聞撰寫繁體中文摘要：

${articlesText}`;

  try {
    // 使用 flash 模型，速度快且免費額度夠用
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
