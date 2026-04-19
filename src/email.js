import nodemailer from "nodemailer";

function markdownToHtml(md) {
  return md
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, "<ul>$&</ul>")
    .split("\n\n")
    .map((p) => (p.startsWith("<h") || p.startsWith("<ul") ? p : `<p>${p}</p>`))
    .join("\n");
}

export async function sendEmail(subject, markdownContent, articles) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO, EMAIL_SUBJECT } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error("Gmail credentials not set");
  if (!EMAIL_TO) throw new Error("EMAIL_TO is not set");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  const today = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sourceLinks = articles
    .map((a) => `<li><a href="${a.url}">${a.title}</a> — ${a.source}</li>`)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 0 auto; color: #222; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 8px; }
  h2 { color: #16213e; margin-top: 32px; }
  h3 { color: #0f3460; margin-top: 20px; }
  p { line-height: 1.7; }
  a { color: #e94560; }
  .sources { background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 32px; }
  .footer { font-size: 12px; color: #888; margin-top: 24px; text-align: center; }
</style>
</head>
<body>
  <h1>📰 每日新聞摘要 — ${today}</h1>
  ${markdownToHtml(markdownContent)}
  <div class="sources">
    <h2>原始來源</h2>
    <ul>${sourceLinks}</ul>
  </div>
  <div class="footer">由 Claude AI 自動生成 • ${today}</div>
</body>
</html>`;

  const finalSubject = EMAIL_SUBJECT ?? subject;
  await transporter.sendMail({
    from: `"每日新聞" <${GMAIL_USER}>`,
    to: EMAIL_TO,
    subject: `${finalSubject} — ${today}`,
    html,
  });

  console.log(`[Email] Sent to ${EMAIL_TO}`);
}
