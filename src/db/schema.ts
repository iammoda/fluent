import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * items — the atomic learnable units of the morphosyntax engine.
 * type: 'verb_form' (lemma x tense x person) | 'pattern' (reusable construction/chunk)
 */
export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lang: text("lang").notNull().default("es"),
    type: text("type").notNull(), // 'verb_form' | 'pattern'
    lemma: text("lemma"), // for verb_form: infinitive; for pattern: key like 'tener_que'
    tense: text("tense"), // 'pres' (more later: 'pret', 'impf', ...)
    person: text("person"), // '1s'|'2s'|'3s'|'1p'|'3p'
    es: text("es").notNull(), // canonical Spanish (form or chunk template)
    en: text("en").notNull(), // English gloss
    contrastGroup: text("contrast_group"), // e.g. 'ser_estar'
    orderIndex: integer("order_index").notNull().default(0), // curriculum order
    status: text("status").notNull().default("active"), // 'active' | 'pending' | 'rejected' 
  },
  (t) => [index("items_order_idx").on(t.orderIndex)],
);

/**
 * prompts — concrete drill prompts attached to an item.
 * promptType: 'en_cue' | 'transformation' | 'contrast' | 'question'
 * accepted: JSON array of acceptable answers (normalized comparison at grade time)
 */
export const prompts = sqliteTable(
  "prompts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    promptType: text("prompt_type").notNull(),
    promptText: text("prompt_text").notNull(),
    expected: text("expected").notNull(),
    accepted: text("accepted").notNull(), // JSON string[]
  },
  (t) => [index("prompts_item_idx").on(t.itemId)],
);

/**
 * srs_states — one FSRS card per item per direction.
 * direction: 'productive' (Phase 1) | 'receptive' (Phase 2)
 */
export const srsStates = sqliteTable(
  "srs_states",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    direction: text("direction").notNull().default("productive"),
    due: integer("due").notNull(), // epoch ms, denormalized for querying
    card: text("card").notNull(), // ts-fsrs Card JSON
  },
  (t) => [
    index("srs_due_idx").on(t.due),
    index("srs_item_idx").on(t.itemId),
  ],
);

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
  kind: text("kind").notNull().default("drill"), // 'drill' | 'speed'
  plannedCount: integer("planned_count").notNull().default(0),
});

/**
 * stories — generated comprehensible input, parameterized by memory state.
 * content: JSON StoryContent (sentences, glosses, questions).
 * targets/missing: which due items were requested / failed validation.
 */
export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at").notNull(),
  lang: text("lang").notNull().default("es"),
  topic: text("topic"),
  title: text("title").notNull(),
  content: text("content").notNull(), // JSON
  targets: text("targets").notNull(), // JSON string[]
  missing: text("missing").notNull().default("[]"), // JSON string[]
});

/**
 * retells — 4/3/2 fluency development rounds (same content, shrinking time).
 * rounds: JSON [{seconds, words, wpm, transcript}] — speech-rate telemetry.
 */
export const retells = sqliteTable("retells", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at").notNull(),
  lang: text("lang").notNull().default("es"),
  storyId: integer("story_id").references(() => stories.id),
  source: text("source").notNull(), // 'story' | 'day'
  rounds: text("rounds").notNull(), // JSON RetellRound[]
});

/**
 * output_tasks — typed pushed-output scenarios. LLM grades the response
 * against due targets; mined errors flow into attempts (error dossier).
 */
export const outputTasks = sqliteTable("output_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at").notNull(),
  lang: text("lang").notNull().default("es"),
  kind: text("kind").notNull().default("scenario"), // 'scenario' | 'boss' 
  scenario: text("scenario").notNull(),
  targets: text("targets").notNull(), // JSON string[]
  response: text("response"),
  feedback: text("feedback"), // JSON WriteFeedback
  gradedAt: integer("graded_at"),
});

/**
 * attempts — every answer becomes training data. Raw answer stored verbatim;
 * everything downstream (FSRS grades, weak spots, briefs) derives from this table.
 */
export const attempts = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id").references(() => sessions.id),
    lang: text("lang").notNull().default("es"),
    itemId: integer("item_id").notNull(),
    promptId: integer("prompt_id").notNull(),
    promptType: text("prompt_type").notNull(),
    expected: text("expected").notNull(),
    userAnswer: text("user_answer").notNull(), // verbatim, never normalized
    correct: integer("correct").notNull(), // 0|1
    errorType: text("error_type"), // taxonomy code, null if clean
    latencyMs: integer("latency_ms").notNull(),
    modality: text("modality").notNull().default("typed"), // 'typed' | 'spoken'
    helpUsed: text("help_used").notNull().default("none"), // 'none'|'hint'|'reveal'
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("attempts_item_idx").on(t.itemId),
    index("attempts_created_idx").on(t.createdAt),
  ],
);

/**
 * islands — personal fluency monologues (Shekhtman). Drafted in English,
 * written at your level by the LLM, practiced mic-free.
 */
export const islands = sqliteTable("islands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lang: text("lang").notNull().default("es"),
  title: text("title").notNull(),
  enDraft: text("en_draft").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** cando_checks — CEFR can-do self-assessment ticks */
export const candoChecks = sqliteTable("cando_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lang: text("lang").notNull().default("es"),
  key: text("key").notNull(), // e.g. 'a1_order_food'
  checkedAt: integer("checked_at").notNull(),
});
