import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const MAX_TEXT = 600;
const CACHE_DIR = path.join(process.cwd(), "data", "tts");

/**
 * GET /api/tts — high-quality TTS with local MP3 cache.
 *  - no `text` param: availability probe (200 if key configured, 503 if not)
 *  - with text/lang/rate: returns cached MP3 or synthesizes via OpenAI tts-1
 * Each unique sentence costs once, ever.
 */
export async function GET(req: Request) {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text")?.slice(0, MAX_TEXT).trim();

  if (!text) {
    // availability probe
    return hasKey
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ ok: false, error: "no OPENAI_API_KEY" }, { status: 503 });
  }
  if (!hasKey) {
    return NextResponse.json({ error: "no OPENAI_API_KEY" }, { status: 503 });
  }

  const lang = searchParams.get("lang") ?? "es-MX";
  const rate = Math.min(1.5, Math.max(0.5, parseFloat(searchParams.get("rate") ?? "0.95") || 0.95));
  const model = process.env.OPENAI_TTS_MODEL ?? "tts-1";
  const voice = process.env.OPENAI_TTS_VOICE ?? "nova";

  const key = crypto
    .createHash("sha256")
    .update(`${model}|${voice}|${lang}|${rate.toFixed(2)}|${text}`)
    .digest("hex");
  const file = path.join(CACHE_DIR, `${key}.mp3`);

  const headers = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  if (fs.existsSync(file)) {
    return new NextResponse(new Uint8Array(fs.readFileSync(file)), { headers });
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      speed: rate,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `OpenAI TTS ${res.status}: ${err.slice(0, 200)}` }, { status: 502 });
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, buf);
  return new NextResponse(new Uint8Array(buf), { headers });
}
