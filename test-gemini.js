import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const envPath = join(process.cwd(), ".env");
console.log("Testing API key from:", envPath);

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

const apikey = process.env.GEMINI_API_KEY;
console.log(`KEY is: "${apikey}", length=${apikey ? apikey.length : 0}`);

const genAI = new GoogleGenerativeAI(apikey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

try {
  const result = await model.generateContent("hi");
  const response = await result.response;
  console.log("WORKS:", response.text());
} catch (e) {
  console.error("FAIL:", e.message);
}
