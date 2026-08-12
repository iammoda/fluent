/**
 * Provider-agnostic LLM adapter.
 * Priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > mock (dev fallback).
 * Override model with LLM_MODEL. No SDK deps — plain fetch.
 */

export type LlmProvider = "anthropic" | "openai" | "mock";

export function activeProvider(): LlmProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export async function complete(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  /** returned verbatim when no API key is configured (mock provider) */
  mockResponse?: string;
}): Promise<string> {
  const provider = activeProvider();
  const maxTokens = opts.maxTokens ?? 2500;

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "claude-sonnet-4-5",
        max_tokens: maxTokens,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  // mock: deterministic fixture so the pipeline is testable without a key
  return opts.mockResponse ?? MOCK_STORY_JSON;
}

/** Extract JSON from an LLM response that may include code fences or prose. */
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in LLM response");
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

const MOCK_STORY_JSON = JSON.stringify({
  title: "Un día en el mercado",
  sentences: [
    { es: "Ana está en casa.", en: "Ana is at home." },
    { es: "Tiene hambre y no hay comida.", en: "She is hungry and there is no food." },
    { es: "«Tengo que ir al mercado», dice Ana.", en: "\"I have to go to the market,\" says Ana." },
    { es: "Ana va al mercado con su amiga Luz.", en: "Ana goes to the market with her friend Luz." },
    { es: "«¿Quieres café?», pregunta Luz.", en: "\"Do you want coffee?\", asks Luz." },
    { es: "«Sí, me gusta el café», dice Ana.", en: "\"Yes, I like coffee,\" says Ana." },
    { es: "Ellas tienen que comprar pan y fruta.", en: "They have to buy bread and fruit." },
    { es: "El pan está caliente y es barato.", en: "The bread is warm and it is cheap." },
    { es: "Ana no puede comprar todo porque necesita más dinero.", en: "Ana can't buy everything because she needs more money." },
    { es: "«Vamos a casa», dice Ana. «Voy a hacer la cena».", en: "\"Let's go home,\" says Ana. \"I am going to make dinner.\"" },
  ],
  new_words: [
    { es: "comida", en: "food" },
    { es: "comprar", en: "to buy" },
    { es: "pan", en: "bread" },
    { es: "fruta", en: "fruit" },
    { es: "barato", en: "cheap" },
    { es: "dinero", en: "money" },
  ],
  questions: [
    { q_es: "¿Por qué va Ana al mercado?", a_es: "Porque tiene hambre y no hay comida en casa." },
    { q_es: "¿Qué va a hacer Ana en casa?", a_es: "Va a hacer la cena." },
  ],
});
