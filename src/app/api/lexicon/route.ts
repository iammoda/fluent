import { NextResponse } from "next/server";
import { and, desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { items, prompts, srsStates } from "@/db/schema";
import { activeLang, LANG_META } from "@/lib/lang";
import { complete, extractJson, activeProvider } from "@/lib/llm";
import { normLoose } from "@/lib/grading";

export const dynamic = "force-dynamic";

interface LexDraft {
  canonical: string;
  en: string;
  prompts: { promptType: "en_cue" | "question"; promptText: string; expected: string; accepted: string[] }[];
}

/** GET — list your custom items */
export async function GET() {
  const lang = await activeLang();
  const rows = db
    .select()
    .from(items)
    .where(and(eq(items.lang, lang), like(items.lemma, "custom_%")))
    .orderBy(desc(items.id))
    .all();
  return NextResponse.json({ items: rows, provider: activeProvider() });
}

/** POST — {action:'draft', text, note?} | {action:'save', draft} | {action:'delete', itemId} */
export async function POST(req: Request) {
  const lang = await activeLang();
  const body = await req.json();

  try {
    if (body.action === "draft") {
      const input = String(body.text ?? "").trim().slice(0, 160);
      if (!input) return NextResponse.json({ error: "empty" }, { status: 400 });
      const note = String(body.note ?? "").trim().slice(0, 240);
      const debrief = body.mode === "debrief"; // "I couldn't say X" — input is ENGLISH
      const langName = LANG_META[lang].name;

      const system = debrief
        ? `A learner just finished a ${langName} conversation and reports something they WANTED to say but couldn't. Turn it into a drill item: the simplest natural ${langName} way to express it, at A1-A2 level. Strict JSON only.`
        : `You turn a ${langName} word or chunk a learner encountered into a drill item for an A1-A2 English speaker. Strict JSON only.`;
      const user = [
        debrief
          ? `The learner couldn't say (English): "${input}"`
          : `Word/chunk the learner encountered: "${input}"`,
        note ? `Context note: ${note}` : "",
        `Produce: {"canonical": string (${debrief ? `the ${langName} chunk that expresses it` : `corrected/canonical ${langName} form`}), "en": string (short gloss), "prompts": [1-2 of {"promptType":"en_cue","promptText":string (natural English sentence cue),"expected":string (short full ${langName} sentence using the chunk),"accepted":[string] (generous variants${lang === "es" ? ", with/without subject pronouns" : ", il/elle/on variants, elisions"})}]}`,
        `Keep sentences ≤ 9 words, everyday register.`,
      ]
        .filter(Boolean)
        .join("\n");

      const mockResponse = JSON.stringify({
        canonical: input.toLowerCase(),
        en: note || "(add your own gloss — mock mode)",
        prompts: [
          {
            promptType: "en_cue",
            promptText: `Say it in ${langName}: "${input}"`,
            expected: input.toLowerCase(),
            accepted: [input.toLowerCase()],
          },
        ],
      } satisfies LexDraft);

      const draft = extractJson<LexDraft>(await complete({ system, user, mockResponse }));
      draft.prompts = (draft.prompts ?? []).filter((p) => p.promptText && p.expected).slice(0, 2);
      if (draft.prompts.length === 0) throw new Error("no usable prompts generated");
      return NextResponse.json({ draft });
    }

    if (body.action === "save") {
      const d = body.draft as LexDraft;
      if (!d?.canonical?.trim() || !d?.en?.trim() || !Array.isArray(d.prompts) || d.prompts.length === 0) {
        return NextResponse.json({ error: "incomplete draft" }, { status: 400 });
      }
      // dedupe: never create a second item for the same form
      const canonNorm = normLoose(d.canonical);
      const existing = db
        .select({ id: items.id, es: items.es })
        .from(items)
        .where(eq(items.lang, lang))
        .all()
        .find((r) => normLoose(r.es) === canonNorm);
      if (existing) {
        return NextResponse.json({ itemId: existing.id, duplicate: true });
      }
      const [row] = db
        .insert(items)
        .values({
          lang,
          type: "pattern",
          lemma: `custom_${Date.now()}`,
          es: d.canonical.trim(),
          en: d.en.trim(),
          orderIndex: 1, // jumps the new-item queue
          status: "active",
        })
        .returning({ id: items.id })
        .all();
      for (const p of d.prompts) {
        db.insert(prompts)
          .values({
            itemId: row.id,
            promptType: p.promptType === "question" ? "question" : "en_cue",
            promptText: p.promptText.trim(),
            expected: p.expected.trim(),
            accepted: JSON.stringify([...new Set([p.expected.trim(), ...(p.accepted ?? [])])]),
          })
          .run();
      }
      return NextResponse.json({ itemId: row.id });
    }

    if (body.action === "delete") {
      const id = Number(body.itemId);
      const item = db
        .select()
        .from(items)
        .where(and(eq(items.id, id), like(items.lemma, "custom_%")))
        .all()[0];
      if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
      db.delete(prompts).where(eq(prompts.itemId, id)).run();
      db.delete(srsStates).where(eq(srsStates.itemId, id)).run();
      db.delete(items).where(eq(items.id, id)).run();
      return NextResponse.json({ deleted: id });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
