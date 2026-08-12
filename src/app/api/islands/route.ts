import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { islands, items, srsStates } from "@/db/schema";
import { activeLang, LANG_META } from "@/lib/lang";
import { complete, activeProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

function knownChunks(lang: string): string[] {
  return db
    .select({ es: items.es })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
    .all()
    .map((r) => r.es);
}

/** GET — list islands for active language */
export async function GET() {
  const lang = await activeLang();
  const rows = db.select().from(islands).where(eq(islands.lang, lang)).orderBy(desc(islands.id)).all();
  return NextResponse.json({ islands: rows, provider: activeProvider() });
}

/** POST — {action:'write', title, enDraft} | {action:'save', id?, title, enDraft, text} | {action:'delete', id} */
export async function POST(req: Request) {
  const lang = await activeLang();
  const body = await req.json();
  try {
    if (body.action === "write") {
      const title = String(body.title ?? "").trim().slice(0, 80);
      const enDraft = String(body.enDraft ?? "").trim().slice(0, 1200);
      if (!title || !enDraft) return NextResponse.json({ error: "need title and draft" }, { status: 400 });
      const langName = LANG_META[lang].name;
      const known = knownChunks(lang);

      const system = `You write personal "fluency island" monologues in simple ${langName} for an A1-A2 English speaker. Output ONLY the ${langName} text, 5-8 short sentences, no preamble, no translation.`;
      const user = [
        `The learner wants a personal monologue titled "${title}". Their English draft:`,
        enDraft,
        ``,
        `Rewrite it as natural spoken ${langName} they can memorize:`,
        `- 5-8 sentences, each ≤ 10 words, present tense (near-future with ${lang === "es" ? "ir a" : "aller"} allowed).`,
        `- Prefer their tracked chunks where natural: ${known.slice(0, 60).join(", ")}.`,
        `- First person, conversational register, no rare vocabulary.`,
      ].join("\n");

      const mockResponse =
        lang === "es"
          ? "Me llamo Sam. Tengo que trabajar mucho. Me gusta el café. Quiero aprender español. Voy a practicar todos los días."
          : "Je m'appelle Sam. Je dois beaucoup travailler. J'aime le café. Je veux apprendre le français. Je vais pratiquer tous les jours.";

      const text = (await complete({ system, user, mockResponse })).trim();
      return NextResponse.json({ text });
    }

    if (body.action === "save") {
      const title = String(body.title ?? "").trim().slice(0, 80);
      const enDraft = String(body.enDraft ?? "").trim();
      const text = String(body.text ?? "").trim();
      if (!title || !text) return NextResponse.json({ error: "need title and text" }, { status: 400 });
      const now = Date.now();
      if (body.id) {
        db.update(islands)
          .set({ title, enDraft, text, updatedAt: now })
          .where(and(eq(islands.id, Number(body.id)), eq(islands.lang, lang)))
          .run();
        return NextResponse.json({ id: Number(body.id) });
      }
      const [row] = db
        .insert(islands)
        .values({ lang, title, enDraft, text, createdAt: now, updatedAt: now })
        .returning({ id: islands.id })
        .all();
      return NextResponse.json({ id: row.id });
    }

    if (body.action === "delete") {
      db.delete(islands)
        .where(and(eq(islands.id, Number(body.id)), eq(islands.lang, lang)))
        .run();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
