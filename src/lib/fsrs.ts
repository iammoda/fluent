/**
 * FSRS wrapper: card storage, revival, and the grade mapping.
 * Grade mapping encodes the design rule: slow-but-correct != mastered,
 * and a reveal is a lapse.
 */
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Grade,
  type Card,
} from "ts-fsrs";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export function newCard(): Card {
  return createEmptyCard(new Date());
}

export function reviveCard(json: string): Card {
  const c = JSON.parse(json);
  c.due = new Date(c.due);
  if (c.last_review) c.last_review = new Date(c.last_review);
  return c as Card;
}

export function serializeCard(card: Card): { json: string; due: number } {
  return { json: JSON.stringify(card), due: card.due.getTime() };
}

/**
 * Latency thresholds for full-sentence production (ms).
 * Speaking is faster than typing, so spoken answers are held to a
 * tighter standard — the point is retrieval speed, not typing speed.
 */
const THRESHOLDS: Record<string, { fast: number; slow: number }> = {
  typed: { fast: 8000, slow: 20000 },
  spoken: { fast: 5000, slow: 12000 },
};

export function ratingFor(opts: {
  correct: boolean;
  latencyMs: number;
  helpUsed: string;
  modality?: string;
}): Grade {
  const { correct, latencyMs, helpUsed } = opts;
  const th = THRESHOLDS[opts.modality ?? "typed"] ?? THRESHOLDS.typed;
  if (!correct || helpUsed === "reveal") return Rating.Again;
  if (helpUsed === "hint") return Rating.Hard;
  if (latencyMs > th.slow) return Rating.Hard;
  if (latencyMs < th.fast) return Rating.Easy;
  return Rating.Good;
}

export function applyRating(card: Card, rating: Grade): Card {
  return scheduler.next(card, new Date(), rating).card;
}
