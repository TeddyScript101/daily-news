import axios from "axios";
import Parser from "rss-parser";

const rssParser = new Parser({ timeout: 10000 });

const HK_RSS_FEEDS = [
  { source: "香港電台", url: "https://rthk.hk/rthk/news/rss/e_expressnews_elocal.xml" },
  { source: "南華早報", url: "https://www.scmp.com/rss/2/feed" },
  { source: "香港自由新聞", url: "https://hongkongfp.com/feed/" },
];

// 1. Use Regex with word boundaries (\b) to prevent false positives
const EXCLUDE_KEYWORDS = [
  "box office", "celebrity", "gossip", "oscar", "grammy", "emmy",
  "anime", "manga", "concert", "movie review", "film review",
  "nba", "nfl", "nhl", "premier league", "formula 1", "grand prix",
  "pre-season", "manchester city", "manchester united", "liverpool fc",
  "arsenal", "chelsea fc", "la liga", "serie a", "bundesliga", "uefa", "fifa",
  "stock market", "dow jones", "s&p 500", "nasdaq", "crypto", "bitcoin",
  "ethereum", "forex", "hedge fund",
];

// Create a global, case-insensitive regex
const excludeRegex = new RegExp(`\\b(${EXCLUDE_KEYWORDS.join("|")})\\b`, "i");

// 2. Unified filtering function
function isCurrentAffairs(article) {
  // Fallback to empty string to prevent null reference errors
  const title = article.title || "";
  const description = article.description || "";
  const text = `${title} ${description}`;

  // Drop the article if it matches any excluded keyword
  return !excludeRegex.test(text);
}

async function fetchHKViaRSS(perFeed) {
  const results = await Promise.allSettled(
    HK_RSS_FEEDS.map((feed) => rssParser.parseURL(feed.url))
  );

  const articles = [];
  for (let i = 0; i < HK_RSS_FEEDS.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      console.warn(`[RSS] ${HK_RSS_FEEDS[i].source} failed: ${result.reason?.message}`);
      continue;
    }

    result.value.items.forEach((item) => {
      articles.push({
        title: item.title?.trim(),
        description: item.contentSnippet || item.content || item.summary || "",
        source: HK_RSS_FEEDS[i].source,
        url: item.link,
        publishedAt: item.isoDate || item.pubDate,
        region: "香港",
      });
    });
  }

  return articles
    .filter((a) => a.title && a.url)
    .filter(isCurrentAffairs)
    .slice(0, perFeed * HK_RSS_FEEDS.length); // Slice after filtering to ensure enough items
}

async function fetchAUViaNewsAPI(apiKey, pageSize) {
  // Minimal API-side exclusion to avoid URL length limits
  const AU_EXCLUDE = 'NOT sports NOT entertainment NOT "box office"';

  // Request a larger buffer since local regex will filter out many articles
  const fetchSize = pageSize * 3;

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        apiKey,
        q: `Australia ${AU_EXCLUDE}`,
        language: "en",
        sortBy: "publishedAt",
        pageSize: fetchSize > 100 ? 100 : fetchSize,
      },
    });

    return response.data.articles
      .filter((a) => a.title && a.description && a.title !== "[Removed]")
      .map((a) => ({
        title: a.title,
        description: a.description,
        source: a.source?.name ?? "Unknown",
        url: a.url,
        publishedAt: a.publishedAt,
        region: "澳洲",
      }))
      .filter(isCurrentAffairs);
  } catch (error) {
    console.error(`[NewsAPI] Australia fetch failed:`, error.message);
    return [];
  }
}

export async function fetchTopNews() {
  const { NEWS_API_KEY, NEWS_PAGE_SIZE = "5" } = process.env;

  if (!NEWS_API_KEY) throw new Error("NEWS_API_KEY is not set");

  const targetPerRegion = parseInt(NEWS_PAGE_SIZE, 10);

  const [hkArticles, auArticles] = await Promise.all([
    fetchHKViaRSS(targetPerRegion),
    fetchAUViaNewsAPI(NEWS_API_KEY, targetPerRegion),
  ]);

  // Cap the final output size per region
  const finalHK = hkArticles.slice(0, targetPerRegion);
  const finalAU = auArticles.slice(0, targetPerRegion);

  const articles = [...finalHK, ...finalAU];
  articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  console.log(`[News] HK RSS(${finalHK.length}) + AU NewsAPI(${finalAU.length}) = ${articles.length} articles`);
  return articles;
}