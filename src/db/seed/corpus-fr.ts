/**
 * Seed corpus: French Phase 1.
 * Same architecture as Spanish, one structural difference: French requires
 * subject pronouns, so forms store the full "pronoun + verb" string (with
 * elision: j'ai, j'aime) and the bare form separately for the taxonomy index.
 * Contrast set: être/avoir idioms (j'ai faim, not je suis faim) — the
 * classic English/Spanish interference point.
 */
import type { PersonCode } from "./corpus";

export const PRONOUN_EN_FR: Record<PersonCode, string> = {
  "1s": "I",
  "2s": "You",
  "3s": "She",
  "1p": "We",
  "3p": "They",
};

export const PERSON_LABEL_FR: Record<PersonCode, string> = {
  "1s": "je",
  "2s": "tu",
  "3s": "elle",
  "1p": "nous",
  "3p": "ils",
};

export interface FrForm {
  full: string; // "j'ai" — subject pronoun included (required in French)
  bare: string; // "ai" — for the morphosyntax form index
  alts?: string[]; // alternative subjects: "elle a", "on a", ...
}

export interface FrVerbDef {
  lemma: string;
  en: string;
  order: number;
  forms: Record<PersonCode, FrForm>;
  frame: {
    frRest: string;
    enVerb: Record<PersonCode, string>;
    enRest: string;
  };
}

export const FR_VERBS: FrVerbDef[] = [
  {
    lemma: "être",
    en: "to be",
    order: 10,
    forms: {
      "1s": { full: "je suis", bare: "suis" },
      "2s": { full: "tu es", bare: "es" },
      "3s": { full: "elle est", bare: "est", alts: ["il est", "on est"] },
      "1p": { full: "nous sommes", bare: "sommes", alts: ["on est"] },
      "3p": { full: "ils sont", bare: "sont", alts: ["elles sont"] },
    },
    frame: {
      frRest: "de Paris",
      enVerb: { "1s": "am", "2s": "are", "3s": "is", "1p": "are", "3p": "are" },
      enRest: "from Paris",
    },
  },
  {
    lemma: "avoir",
    en: "to have",
    order: 20,
    forms: {
      "1s": { full: "j'ai", bare: "ai" },
      "2s": { full: "tu as", bare: "as" },
      "3s": { full: "elle a", bare: "a", alts: ["il a", "on a"] },
      "1p": { full: "nous avons", bare: "avons", alts: ["on a"] },
      "3p": { full: "ils ont", bare: "ont", alts: ["elles ont"] },
    },
    frame: {
      frRest: "un chien",
      enVerb: { "1s": "have", "2s": "have", "3s": "has", "1p": "have", "3p": "have" },
      enRest: "a dog",
    },
  },
  {
    lemma: "aller",
    en: "to go",
    order: 30,
    forms: {
      "1s": { full: "je vais", bare: "vais" },
      "2s": { full: "tu vas", bare: "vas" },
      "3s": { full: "elle va", bare: "va", alts: ["il va", "on va"] },
      "1p": { full: "nous allons", bare: "allons", alts: ["on va"] },
      "3p": { full: "ils vont", bare: "vont", alts: ["elles vont"] },
    },
    frame: {
      frRest: "au marché",
      enVerb: { "1s": "go", "2s": "go", "3s": "goes", "1p": "go", "3p": "go" },
      enRest: "to the market",
    },
  },
  {
    lemma: "vouloir",
    en: "to want",
    order: 40,
    forms: {
      "1s": { full: "je veux", bare: "veux" },
      "2s": { full: "tu veux", bare: "veux" },
      "3s": { full: "elle veut", bare: "veut", alts: ["il veut"] },
      "1p": { full: "nous voulons", bare: "voulons", alts: ["on veut"] },
      "3p": { full: "ils veulent", bare: "veulent", alts: ["elles veulent"] },
    },
    frame: {
      frRest: "plus de café",
      enVerb: { "1s": "want", "2s": "want", "3s": "wants", "1p": "want", "3p": "want" },
      enRest: "more coffee",
    },
  },
  {
    lemma: "pouvoir",
    en: "to be able to / can",
    order: 50,
    forms: {
      "1s": { full: "je peux", bare: "peux" },
      "2s": { full: "tu peux", bare: "peux" },
      "3s": { full: "elle peut", bare: "peut", alts: ["il peut"] },
      "1p": { full: "nous pouvons", bare: "pouvons", alts: ["on peut"] },
      "3p": { full: "ils peuvent", bare: "peuvent", alts: ["elles peuvent"] },
    },
    frame: {
      frRest: "aider",
      enVerb: { "1s": "can", "2s": "can", "3s": "can", "1p": "can", "3p": "can" },
      enRest: "help",
    },
  },
  {
    lemma: "devoir",
    en: "to have to / must",
    order: 60,
    forms: {
      "1s": { full: "je dois", bare: "dois" },
      "2s": { full: "tu dois", bare: "dois" },
      "3s": { full: "elle doit", bare: "doit", alts: ["il doit"] },
      "1p": { full: "nous devons", bare: "devons", alts: ["on doit"] },
      "3p": { full: "ils doivent", bare: "doivent", alts: ["elles doivent"] },
    },
    frame: {
      frRest: "partir",
      enVerb: { "1s": "must", "2s": "must", "3s": "must", "1p": "must", "3p": "must" },
      enRest: "leave",
    },
  },
  {
    lemma: "faire",
    en: "to do / to make",
    order: 70,
    forms: {
      "1s": { full: "je fais", bare: "fais" },
      "2s": { full: "tu fais", bare: "fais" },
      "3s": { full: "elle fait", bare: "fait", alts: ["il fait"] },
      "1p": { full: "nous faisons", bare: "faisons", alts: ["on fait"] },
      "3p": { full: "ils font", bare: "font", alts: ["elles font"] },
    },
    frame: {
      frRest: "le dîner",
      enVerb: { "1s": "make", "2s": "make", "3s": "makes", "1p": "make", "3p": "make" },
      enRest: "dinner",
    },
  },
  {
    lemma: "aimer",
    en: "to like / to love",
    order: 80,
    forms: {
      "1s": { full: "j'aime", bare: "aime" },
      "2s": { full: "tu aimes", bare: "aimes" },
      "3s": { full: "elle aime", bare: "aime", alts: ["il aime"] },
      "1p": { full: "nous aimons", bare: "aimons", alts: ["on aime"] },
      "3p": { full: "ils aiment", bare: "aiment", alts: ["elles aiment"] },
    },
    frame: {
      frRest: "le café",
      enVerb: { "1s": "like", "2s": "like", "3s": "likes", "1p": "like", "3p": "like" },
      enRest: "coffee",
    },
  },
];

export interface FrPatternDef {
  key: string;
  fr: string;
  en: string;
  order: number;
  prompts: {
    type: "en_cue" | "question";
    text: string;
    expected: string;
    accepted: string[];
  }[];
}

export const FR_PATTERNS: FrPatternDef[] = [
  {
    key: "je_mappelle",
    fr: "je m'appelle...",
    en: "my name is...",
    order: 12,
    prompts: [
      {
        type: "en_cue",
        text: "My name is Anne.",
        expected: "je m'appelle anne",
        accepted: ["je m'appelle anne", "mon nom est anne"],
      },
    ],
  },
  {
    key: "je_voudrais",
    fr: "je voudrais + nom/infinitif",
    en: "I would like (polite requests)",
    order: 15,
    prompts: [
      {
        type: "en_cue",
        text: "I would like a coffee, please.",
        expected: "je voudrais un café, s'il vous plaît",
        accepted: ["je voudrais un café", "je voudrais un café s'il vous plaît", "je voudrais un café s'il te plaît"],
      },
    ],
  },
  {
    key: "il_y_a",
    fr: "il y a + nom",
    en: "there is / there are",
    order: 25,
    prompts: [
      {
        type: "en_cue",
        text: "There is a problem.",
        expected: "il y a un problème",
        accepted: ["il y a un problème"],
      },
      {
        type: "en_cue",
        text: "There are two rooms.",
        expected: "il y a deux chambres",
        accepted: ["il y a deux chambres", "il y a deux pièces"],
      },
    ],
  },
  {
    key: "ou_est",
    fr: "où est... ?",
    en: "where is...?",
    order: 27,
    prompts: [
      {
        type: "question",
        text: "Ask: Where is the bathroom?",
        expected: "où est la salle de bain ?",
        accepted: ["où est la salle de bain", "où sont les toilettes", "où est la salle de bains"],
      },
    ],
  },
  {
    key: "il_faut",
    fr: "il faut + infinitif",
    en: "one must / we have to (impersonal)",
    order: 35,
    prompts: [
      {
        type: "en_cue",
        text: "We have to leave. (impersonal: il faut...)",
        expected: "il faut partir",
        accepted: ["il faut partir", "il faut qu'on parte", "nous devons partir", "on doit partir"],
      },
    ],
  },
  {
    key: "jai_faim",
    fr: "j'ai faim / soif",
    en: "I'm hungry / thirsty (with avoir!)",
    order: 37,
    prompts: [
      {
        type: "en_cue",
        text: "I am hungry.",
        expected: "j'ai faim",
        accepted: ["j'ai faim"],
      },
      {
        type: "en_cue",
        text: "I am thirsty.",
        expected: "j'ai soif",
        accepted: ["j'ai soif"],
      },
    ],
  },
  {
    key: "est_ce_que",
    fr: "est-ce que... ?",
    en: "question marker",
    order: 38,
    prompts: [
      {
        type: "question",
        text: "Ask a friend: Do you have time?",
        expected: "est-ce que tu as le temps ?",
        accepted: ["est-ce que tu as le temps", "tu as le temps", "as-tu le temps"],
      },
      {
        type: "question",
        text: "Ask a friend: Do you want to eat?",
        expected: "est-ce que tu veux manger ?",
        accepted: ["est-ce que tu veux manger", "tu veux manger", "veux-tu manger"],
      },
    ],
  },
  {
    key: "aller_inf",
    fr: "aller + infinitif",
    en: "going to (futur proche)",
    order: 45,
    prompts: [
      {
        type: "en_cue",
        text: "I am going to eat now.",
        expected: "je vais manger maintenant",
        accepted: ["je vais manger maintenant", "maintenant je vais manger"],
      },
      {
        type: "en_cue",
        text: "We are going to speak tomorrow.",
        expected: "nous allons parler demain",
        accepted: ["nous allons parler demain", "on va parler demain", "demain on va parler"],
      },
    ],
  },
  {
    key: "je_veux_inf",
    fr: "vouloir + infinitif",
    en: "to want to do sth",
    order: 55,
    prompts: [
      {
        type: "en_cue",
        text: "I want to learn French.",
        expected: "je veux apprendre le français",
        accepted: ["je veux apprendre le français"],
      },
      {
        type: "en_cue",
        text: "She wants to eat.",
        expected: "elle veut manger",
        accepted: ["elle veut manger", "il veut manger"],
      },
    ],
  },
  {
    key: "peux_maider",
    fr: "pouvoir + infinitif",
    en: "can do sth",
    order: 65,
    prompts: [
      {
        type: "question",
        text: "Ask a friend: Can you help me?",
        expected: "est-ce que tu peux m'aider ?",
        accepted: ["est-ce que tu peux m'aider", "tu peux m'aider", "peux-tu m'aider"],
      },
      {
        type: "en_cue",
        text: "I can't go today.",
        expected: "je ne peux pas y aller aujourd'hui",
        accepted: ["je ne peux pas y aller aujourd'hui", "je ne peux pas aller aujourd'hui", "je peux pas y aller aujourd'hui"],
      },
    ],
  },
  {
    key: "avoir_besoin",
    fr: "avoir besoin de + infinitif/nom",
    en: "to need",
    order: 85,
    prompts: [
      {
        type: "en_cue",
        text: "I need to sleep.",
        expected: "j'ai besoin de dormir",
        accepted: ["j'ai besoin de dormir", "je dois dormir"],
      },
    ],
  },
  {
    key: "jaime_inf",
    fr: "aimer + infinitif",
    en: "to like doing sth",
    order: 90,
    prompts: [
      {
        type: "en_cue",
        text: "I like to read.",
        expected: "j'aime lire",
        accepted: ["j'aime lire"],
      },
    ],
  },
  {
    key: "combien",
    fr: "combien ça coûte ?",
    en: "how much does it cost?",
    order: 97,
    prompts: [
      {
        type: "question",
        text: "Ask: How much does it cost?",
        expected: "combien ça coûte ?",
        accepted: ["combien ça coûte", "c'est combien", "ça coûte combien"],
      },
    ],
  },
  {
    key: "venir_de",
    fr: "venir de + infinitif",
    en: "to have just done sth",
    order: 100,
    prompts: [
      {
        type: "en_cue",
        text: "I just ate.",
        expected: "je viens de manger",
        accepted: ["je viens de manger"],
      },
    ],
  },
];

/** être/avoir contrast — French says "I HAVE hunger/thirst/age/fear" */
export interface FrContrastPrompt {
  lemma: "être" | "avoir";
  person: PersonCode;
  text: string;
  expected: string;
  accepted: string[];
}

export const ETRE_AVOIR_CONTRASTS: FrContrastPrompt[] = [
  {
    lemma: "avoir",
    person: "1s",
    text: "I am hungry. (être or avoir?)",
    expected: "j'ai faim",
    accepted: ["j'ai faim"],
  },
  {
    lemma: "être",
    person: "1s",
    text: "I am tired. (être or avoir?)",
    expected: "je suis fatigué",
    accepted: ["je suis fatigué", "je suis fatiguée"],
  },
  {
    lemma: "avoir",
    person: "1s",
    text: "I am thirsty. (être or avoir?)",
    expected: "j'ai soif",
    accepted: ["j'ai soif"],
  },
  {
    lemma: "avoir",
    person: "3s",
    text: "She is thirty years old. (être or avoir?)",
    expected: "elle a trente ans",
    accepted: ["elle a trente ans", "elle a 30 ans"],
  },
  {
    lemma: "être",
    person: "1p",
    text: "We are late. (être or avoir?)",
    expected: "nous sommes en retard",
    accepted: ["nous sommes en retard", "on est en retard"],
  },
  {
    lemma: "avoir",
    person: "1s",
    text: "I am afraid. (être or avoir?)",
    expected: "j'ai peur",
    accepted: ["j'ai peur"],
  },
  {
    lemma: "être",
    person: "3s",
    text: "He is a doctor. (être or avoir?)",
    expected: "il est médecin",
    accepted: ["il est médecin", "il est docteur"],
  },
  {
    lemma: "avoir",
    person: "3p",
    text: "They are cold. (être or avoir?)",
    expected: "ils ont froid",
    accepted: ["ils ont froid", "elles ont froid"],
  },
];
