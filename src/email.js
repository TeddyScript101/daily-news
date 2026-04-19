import nodemailer from "nodemailer";

function markdownToHtml(md) {
  return md
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^來源[:：]\s*(.+)$/gm, '<span class="source-text">來源：$1</span><br/>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, "<ul>$&</ul>")
    .split("\n\n")
    .map((p) => {
      if (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<span")) return p;
      return `<p>${p}</p>`;
    })
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
    .map((a) => `<li><a href="${a.url}">${a.title}</a> — <span style="color: #64748b">${a.source}</span></li>`)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #3f3f46; }
  .email-wrapper { max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
  h1 { color: #18181b; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-top: 0; font-size: 26px; }
  h2 { color: #27272a; margin-top: 36px; font-size: 20px; font-weight: 600; }
  h3 { color: #3b82f6; margin-top: 28px; font-size: 18px; margin-bottom: 6px; font-weight: 600; }
  p { line-height: 1.6; font-size: 15px; margin-top: 8px; color: #52525b; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; color: #1d4ed8; }
  .source-text { color: #71717a; font-size: 13px; margin-bottom: 12px; display: inline-block; font-weight: 500; }
  .sources { background: #f8fafc; padding: 20px 24px; border-radius: 10px; margin-top: 40px; border-left: 4px solid #cbd5e1; }
  .sources h2 { margin-top: 0; font-size: 18px; }
  .sources ul { padding-left: 20px; margin-bottom: 0; }
  .sources li { margin-bottom: 10px; color: #475569; font-size: 14px; line-height: 1.5; }
  .footer { font-size: 12px; color: #a1a1aa; margin-top: 32px; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 20px; }
</style>
</head>
<body>
  <div class="email-wrapper">
    <h1>📰 每日新聞摘要 — ${today}</h1>
    ${markdownToHtml(markdownContent)}
    <div class="sources">
      <h2>🔗 原始來源</h2>
      <ul>${sourceLinks}</ul>
    </div>
    <div class="footer">由 Google Gemini AI 自動生成 • ${today}</div>
  </div>
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
