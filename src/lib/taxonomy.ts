/**
 * Morphosyntax error taxonomy classifier (rule-based, Phase 1).
 * Compares the user's wrong answer against the expected answer using the
 * known-form index to say *how* it was wrong, not just that it was wrong.
 * Raw answers are stored verbatim, so this classifier can be improved later
 * and re-run over the entire attempt history.
 */
import { tokens, normLoose } from "./grading";

export type ErrorType =
  | "person"
  | "tense"
  | "ser_estar"
  | "etre_avoir"
  | "verb_choice"
  | "reflexive_missing"
  | "gustar_structure"
  | "accent"
  | "other";

export const ERROR_LABELS: Record<ErrorType, string> = {
  person: "Wrong person (e.g., tengo vs. tiene / j'ai vs. il a)",
  tense: "Wrong tense",
  ser_estar: "ser/estar choice",
  etre_avoir: "être/avoir choice",
  verb_choice: "Wrong verb",
  reflexive_missing: "Missing reflexive pronoun (me/te/se/nos)",
  gustar_structure: "gustar structure (me gusta, not yo gusto)",
  accent: "Accent marks",
  other: "Other",
};

export const ERROR_TIPS: Record<string, string> = {
  person: "Slow down and check WHO does the action before you speak: yo→-o, tú→-es/-as, ella→-e/-a (es) · je/tu/il often sound alike but spell differently (fr).",
  tense: "Anchor the time first: hoy/aujourd'hui (present), mañana/demain (near future with ir a / aller).",
  ser_estar: "ser = what something IS (identity, origin, traits). estar = how/where it IS (state, location, feelings).",
  etre_avoir: "French uses AVOIR for hunger, thirst, age, fear, heat and cold: j'ai faim, j'ai 30 ans, j'ai peur. être for identity and states: je suis fatigué.",
  verb_choice: "You reached for the wrong verb — review the target chunks before your conversation.",
  reflexive_missing: "Some verbs carry me/te/se: me llamo, me voy, me gusta. Say the pronoun as part of the verb.",
  gustar_structure: "gustar works backwards: 'me gusta X' = X pleases me. Never 'yo gusto'.",
  accent: "Content is right — watch written accents (está, más, café / é, è, ç).",
};

export interface FormInfo {
  lemma: string;
  tense: string;
  person: string;
}

/** loose-normalized form string -> info, built from seeded verb_form items */
export type FormIndex = Map<string, FormInfo>;

const REFLEXIVES = new Set(["me", "te", "se", "nos"]);

interface ClassifyArgs {
  expected: string;
  answer: string;
  formIndex: FormIndex;
  /** the item under test, if it's a verb_form */
  expectedForm?: FormInfo | null;
  lang?: string;
}

export function classifyError({ expected, answer, formIndex, expectedForm, lang = "es" }: ClassifyArgs): ErrorType {
  const expTokens = tokens(expected);
  const ansTokens = tokens(answer);
  if (ansTokens.length === 0) return "other";

  // gustar structure: 'yo gusto', bare 'gusto ...' (Spanish only)
  if (lang === "es" && (expTokens.includes("gusta") || expTokens.includes("gustan"))) {
    const ansText = normLoose(answer);
    if (/(^|\s)(yo\s+)?gusto(\s|$)/.test(ansText)) return "gustar_structure";
    if (
      (expTokens.includes("gusta") && ansTokens.includes("gustan")) ||
      (expTokens.includes("gustan") && ansTokens.includes("gusta"))
    )
      return "gustar_structure";
  }

  // missing reflexive: Spanish only — French elision (m'appelle) makes
  // token-level reflexive detection unreliable, so we skip it there.
  if (lang === "es") {
    const expReflex = expTokens.filter((t) => REFLEXIVES.has(t));
    if (expReflex.length > 0 && !ansTokens.some((t) => REFLEXIVES.has(t))) {
      return "reflexive_missing";
    }
  }

  // locate the expected verb form and the user's verb form
  const expForm =
    expectedForm ??
    expTokens.map((t) => formIndex.get(t)).find((f): f is FormInfo => Boolean(f)) ??
    null;
  const ansForm = ansTokens.map((t) => formIndex.get(t)).find((f): f is FormInfo => Boolean(f)) ?? null;

  if (expForm && ansForm) {
    if (expForm.lemma === ansForm.lemma) {
      if (expForm.tense === ansForm.tense && expForm.person !== ansForm.person) return "person";
      if (expForm.tense !== ansForm.tense) return "tense";
      // same lemma+tense+person but sentence still wrong => other
      return "other";
    }
    const pair = new Set([expForm.lemma, ansForm.lemma]);
    if (pair.has("ser") && pair.has("estar")) return "ser_estar";
    if (pair.has("être") && pair.has("avoir")) return "etre_avoir";
    return "verb_choice";
  }

  // expected verb form entirely absent from answer
  if (expForm && !ansForm) return "verb_choice";

  return "other";
}
