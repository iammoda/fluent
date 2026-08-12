import Link from "next/link";
import { notFound } from "next/navigation";
import { ERROR_LABELS, type ErrorType } from "@/lib/taxonomy";
import { Card, Sticker, ButtonLink } from "@/components/ui";
import { Emoji } from "@/components/Doodles";

export const dynamic = "force-dynamic";

interface Lesson {
  title: string;
  body: string[];
  examples: { wrong: string; right: string; note: string }[];
}

const LESSONS: Partial<Record<ErrorType, Lesson>> = {
  person: {
    title: "Person endings — who does the action?",
    body: [
      "The verb ending IS the subject in Spanish (and matters just as much in French). Before you speak, lock in WHO acts — the ending follows automatically with practice.",
      "Spanish present: yo → -o (tengo, quiero) · tú → -es/-as (tienes, quieres) · él/ella → -e/-a (tiene, quiere) · nosotros → -emos/-amos · ellos → -en/-an.",
      "French endings often SOUND identical (je parle / tu parles / il parle) — the discipline is in spelling and in the irregular core verbs: j'ai, tu as, il a · je suis, tu es, il est.",
    ],
    examples: [
      { wrong: "ella tengo un perro", right: "ella tiene un perro", note: "tengo = I have; tiene = she has" },
      { wrong: "tu es un chien", right: "tu as un chien", note: "es = are (être); as = have (avoir) — person AND verb" },
      { wrong: "nosotros quiere café", right: "nosotros queremos café", note: "-emos for nosotros" },
    ],
  },
  tense: {
    title: "Tense — anchor the time first",
    body: [
      "Say the time word first and the tense follows: hoy/aujourd'hui → present · mañana/demain → near future (voy a / je vais + infinitive).",
      "You don't need past tense yet — the near-future construction plus present covers most daily communication at this level.",
    ],
    examples: [
      { wrong: "mañana como con Ana", right: "mañana voy a comer con Ana", note: "future plans: ir a + infinitive" },
      { wrong: "demain je mange avec Léa", right: "demain je vais manger avec Léa", note: "futur proche: aller + infinitive" },
    ],
  },
  ser_estar: {
    title: "ser vs. estar — what it IS vs. how it IS",
    body: [
      "ser = identity, origin, profession, traits — things that define. estar = location, feelings, temporary states — things that describe right now.",
      "Test: could it change by tonight? If yes → estar. 'Soy médico' (still true tonight) vs. 'estoy cansado' (hopefully not).",
      "Location is ALWAYS estar, even for permanent things: 'Madrid está en España.'",
    ],
    examples: [
      { wrong: "soy cansado", right: "estoy cansado", note: "tiredness is a state → estar" },
      { wrong: "ella está mi hermana", right: "ella es mi hermana", note: "identity → ser" },
      { wrong: "el café es frío", right: "el café está frío", note: "current state → estar (es frío = it's a cold-type coffee)" },
    ],
  },
  etre_avoir: {
    title: "être vs. avoir — French HAS what English IS",
    body: [
      "French uses avoir (to have) where English uses 'to be' for: hunger, thirst, age, fear, heat, cold, being right/wrong.",
      "j'ai faim (I have hunger) · j'ai soif · j'ai 30 ans · j'ai peur · j'ai chaud/froid · tu as raison.",
      "être stays for identity and states: je suis fatigué, elle est médecin, nous sommes en retard.",
    ],
    examples: [
      { wrong: "je suis faim", right: "j'ai faim", note: "hunger takes avoir" },
      { wrong: "elle est trente ans", right: "elle a trente ans", note: "age takes avoir" },
      { wrong: "j'ai fatigué", right: "je suis fatigué", note: "but states take être!" },
    ],
  },
  verb_choice: {
    title: "Wrong verb — strengthen the chunk, not the word",
    body: [
      "Reaching for the wrong verb usually means the chunk isn't automatic yet. Don't memorize the verb in isolation — drill the whole chunk until it fires as one unit: tengo que / je dois, voy a / je vais, me gusta / j'aime.",
    ],
    examples: [
      { wrong: "hago ir al mercado", right: "tengo que ir al mercado", note: "obligation chunk: tener que + inf" },
      { wrong: "je veux de dormir", right: "j'ai besoin de dormir", note: "need: avoir besoin de + inf" },
    ],
  },
  reflexive_missing: {
    title: "The pronoun is part of the verb",
    body: [
      "Some verbs carry their pronoun always: me llamo (not 'llamo'), me voy, me gusta. Learn and say them as single units — 'mellamo', 'megusta' — the pronoun is not optional decoration.",
    ],
    examples: [
      { wrong: "llamo Ana", right: "me llamo Ana", note: "llamarse — the me is built in" },
      { wrong: "gusta el café", right: "me gusta el café", note: "who does it please? me." },
    ],
  },
  gustar_structure: {
    title: "gustar works backwards",
    body: [
      "'Me gusta el café' literally means 'coffee pleases me'. The thing liked is the SUBJECT, you are the object. So: never 'yo gusto'.",
      "Singular thing → gusta. Plural things → gustan: me gusta el café / me gustan los perros. Activities always take gusta: me gusta leer.",
    ],
    examples: [
      { wrong: "yo gusto café", right: "me gusta el café", note: "you are the object: me" },
      { wrong: "me gusta los perros", right: "me gustan los perros", note: "plural → gustan" },
    ],
  },
  accent: {
    title: "Accents carry meaning",
    body: [
      "Your content is right — accents are a spelling-level habit. In Spanish they distinguish words: está (is) vs. esta (this) · más (more) vs. mas · sí (yes) vs. si (if).",
      "In French they change the sound: é (ay) vs. è (eh) vs. e. Type them from the start so your visual memory stores the correct form.",
    ],
    examples: [
      { wrong: "donde esta el bano", right: "dónde está el baño", note: "question words + está + ñ" },
      { wrong: "j'ai mange", right: "j'ai mangé", note: "é marks the past participle sound" },
    ],
  },
  other: {
    title: "Close, but the sentence didn't land",
    body: [
      "This bucket collects misses the app couldn't classify: wrong word order, a missing article, an off vocabulary pick, or a sentence that drifted from the target.",
      "The fix is the same as for every error here: re-encounter the chunk in context. Your failed items are already rescheduled — they'll come back in tomorrow's drills and get woven into your next story.",
      "If you keep seeing the same correction, say the full corrected sentence out loud three times. Chunks stick when your mouth has done them, not just your eyes.",
    ],
    examples: [
      { wrong: "quiero el ir mercado", right: "quiero ir al mercado", note: "keep the chunk intact: ir a + place → al" },
      { wrong: "je veux aller à le marché", right: "je veux aller au marché", note: "à + le contracts to au" },
    ],
  },
};

export default async function LessonPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const lesson = LESSONS[type as ErrorType];
  if (!lesson) notFound();

  return (
    <div className="relative mx-auto max-w-2xl">
      <span className="absolute right-2 top-0"><Emoji size={40} animation="drift">👾</Emoji></span>
      <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
        ← today
      </Link>

      <div className="mt-4">
        <Sticker color="blush" tilt={-3}>boss fight</Sticker>
        <Sticker color="paper" tilt={2} className="ml-2 normal-case">
          {ERROR_LABELS[type as ErrorType]}
        </Sticker>
      </div>
      <h1 className="font-display mt-3 text-4xl font-bold leading-tight">{lesson.title}</h1>

      <Card color="paper" className="mt-6 space-y-3 p-5">
        {lesson.body.map((p, i) => (
          <p key={i} className="leading-relaxed">
            {p}
          </p>
        ))}
      </Card>

      <h2 className="font-display mb-3 mt-8 text-xl font-bold">⚔️ fix these patterns</h2>
      <div className="space-y-3">
        {lesson.examples.map((e, i) => (
          <Card key={i} color={i % 2 === 0 ? "blush" : "mint"} tilt={i % 2 === 0 ? -0.6 : 0.6} className="p-4">
            <div className="font-display text-lg">
              <span className="line-through opacity-60">{e.wrong}</span>
              <span className="mx-2">→</span>
              <span className="font-bold text-limey-deep">{e.right}</span>
            </div>
            <div className="mt-1 text-sm text-ink-soft">{e.note}</div>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <ButtonLink href="/session" color="coral" size="lg" className="w-full">
          ⚔️ FIGHT IT NOW — your session auto-targets this
        </ButtonLink>
      </div>
    </div>
  );
}
