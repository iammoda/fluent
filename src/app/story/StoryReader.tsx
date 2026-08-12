"use client";

/**
 * Story reader — arcade picture-book edition.
 * Pretest-first reveals, karaoke highlight during play-all, sticker glosses.
 * Stories are exposure only — no FSRS writes.
 */
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { speak, speakSeq, stopSpeaking } from "../session/useSpeech";
import { normLoose } from "@/lib/grading";
import type { StoryContent } from "@/lib/story";
import { Button, Card, Sticker } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS, Cloud } from "@/components/Doodles";

export interface StoryView {
  id: number;
  title: string;
  topic: string | null;
  createdAt: number;
  content: StoryContent;
  targets: string[];
  missing: string[];
}

function NewWord({ word, gloss }: { word: string; gloss: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      className="rounded-md bg-sun/70 px-0.5 font-semibold text-ink underline decoration-ink decoration-dashed underline-offset-4 hover:bg-sun"
      title="tap for gloss"
    >
      {word}
      {open && (
        <span className="font-display ml-1 inline-block -rotate-2 rounded-lg border-2 border-ink bg-ink px-1.5 py-0.5 text-xs font-bold text-cream">
          {gloss}
        </span>
      )}
    </button>
  );
}

function Sentence({
  es,
  en,
  glossary,
  ttsLang,
  active,
}: {
  es: string;
  en: string;
  glossary: Map<string, string>;
  ttsLang: string;
  active: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const chunks = es.split(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÂÇÈÉÊËÎÏÔŒÙÛàâçèéêëîïôœùû'’]+)/g);
  return (
    <div
      className={`cursor-pointer rounded-2xl border-2 px-4 py-3 transition-all ${
        active
          ? "border-ink bg-sun/60 shadow-[3px_3px_0_0_#1a1a1a]"
          : "border-transparent hover:border-ink hover:bg-paper"
      }`}
      onClick={() => setRevealed((v) => !v)}
      title="tap to reveal translation"
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            speak(es, { lang: ttsLang });
          }}
          className="mt-1 text-sm opacity-60 hover:opacity-100"
          title="listen"
        >
          🔊
        </button>
        <p className="font-display text-2xl leading-relaxed">
          {chunks.map((c, i) => {
            const gloss = glossary.get(normLoose(c));
            return gloss ? <NewWord key={i} word={c} gloss={gloss} /> : <span key={i}>{c}</span>;
          })}
        </p>
      </div>
      {revealed ? (
        <p className="ml-8 mt-1 text-sm font-medium text-ink-soft">{en}</p>
      ) : (
        <p className="ml-8 mt-1 text-xs text-ink-soft/50">guess first, then tap to check</p>
      )}
    </div>
  );
}

function Question({ q, a, ttsLang }: { q: string; a: string; ttsLang: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card color="paper" className="p-4" tilt={-0.5}>
      <div className="flex items-center gap-2">
        <button onClick={() => speak(q, { lang: ttsLang })} className="text-sm opacity-60 hover:opacity-100">
          🔊
        </button>
        <p className="font-display text-lg font-semibold">{q}</p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">answer out loud, then check:</p>
      {revealed ? (
        <p className="font-display mt-2 text-lg text-limey-deep">{a}</p>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="font-display mt-2 text-sm font-semibold underline decoration-dotted"
        >
          show answer
        </button>
      )}
    </Card>
  );
}

export default function StoryReader({
  initialStory,
  provider,
  ttsLang = "es-MX",
}: {
  initialStory: StoryView | null;
  provider: string;
  ttsLang?: string;
}) {
  const [story, setStory] = useState<StoryView | null>(initialStory);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSentence, setActiveSentence] = useState<number | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "generation failed");
      const row = data.story;
      setStory({
        id: row.id,
        title: row.title,
        topic: row.topic,
        createdAt: row.createdAt,
        content: JSON.parse(row.content),
        targets: JSON.parse(row.targets),
        missing: JSON.parse(row.missing),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
    }
    setGenerating(false);
  };

  const playAll = () => {
    if (!story) return;
    speakSeq(
      story.content.sentences.map((s) => s.es),
      { lang: ttsLang, onIndex: setActiveSentence },
    );
  };

  const glossary = new Map<string, string>();
  if (story) {
    for (const w of story.content.new_words) glossary.set(normLoose(w.es.split(" ")[0]), w.en);
  }

  return (
    <div className="relative mx-auto max-w-3xl">
      <DoodleField set={EMOJI_SETS.story} count={8} />
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
          ← today
        </Link>
        {provider === "mock" && (
          <Sticker color="sun" tilt={-2} className="normal-case">
            mock LLM — add an API key for real stories
          </Sticker>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="a topic you'd love… (optional)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !generating) generate();
          }}
          className="flex-1 rounded-2xl border-2 border-ink bg-paper px-4 py-2.5 outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
        />
        <Button color="coral" onClick={generate} disabled={generating}>
          {generating ? "writing…" : story ? "new episode" : "generate"}
        </Button>
      </div>

      {error && (
        <Card color="blush" className="mt-4 p-3 text-sm font-medium">
          {error}
        </Card>
      )}

      {!story ? (
        <div className="py-16 text-center">
          <Emoji size={64} animation="floaty">📖</Emoji>
          <h1 className="font-display mt-4 text-3xl font-bold">No episode yet</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">
            Hit generate — the story is written around the exact verb forms you&apos;re due to review, about
            whatever topic you type.
          </p>
        </div>
      ) : (
        <motion.article initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6">
          <div className="flex items-start justify-between">
            <h1 className="font-display text-4xl font-bold leading-tight">{story.title}</h1>
            <Cloud size={54} className="mt-1 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button color="lime" size="sm" onClick={playAll}>
              ▶ play all
            </Button>
            <Button
              color="paper"
              size="sm"
              onClick={() => {
                stopSpeaking();
                setActiveSentence(null);
              }}
            >
              ■ stop
            </Button>
            {story.targets.map((t) => (
              <Sticker
                key={t}
                color={story.missing.includes(t) ? "blush" : "mint"}
                tilt={-2}
                className={`normal-case ${story.missing.includes(t) ? "line-through opacity-60" : ""}`}
              >
                {t}
              </Sticker>
            ))}
          </div>

          <Card color="paper" className="mt-5 space-y-1 p-3">
            {story.content.sentences.map((s, i) => (
              <Sentence
                key={`${story.id}-${i}`}
                es={s.es}
                en={s.en}
                glossary={glossary}
                ttsLang={ttsLang}
                active={activeSentence === i}
              />
            ))}
          </Card>

          {story.content.new_words.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">loot drops ✨</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {story.content.new_words.map((w, i) => (
                  <Sticker key={w.es} color={i % 2 === 0 ? "sun" : "mint"} tilt={i % 2 === 0 ? -2 : 2} className="text-sm normal-case">
                    <button onClick={() => speak(w.es, { lang: ttsLang })} className="mr-1">🔊</button>
                    <b>{w.es}</b> · {w.en}
                  </Sticker>
                ))}
              </div>
            </section>
          )}

          {story.content.questions.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">boss questions 🎤</h2>
              <div className="mt-3 space-y-3">
                {story.content.questions.map((q, i) => (
                  <Question key={`${story.id}-q${i}`} q={q.q_es} a={q.a_es} ttsLang={ttsLang} />
                ))}
              </div>
            </section>
          )}
        </motion.article>
      )}
    </div>
  );
}
