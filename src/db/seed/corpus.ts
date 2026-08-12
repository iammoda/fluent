/**
 * Seed corpus: Spanish Phase 1.
 * Curriculum: 8 core verbs (present tense, 5 persons) + ~22 high-frequency
 * patterns/chunks + ser/estar contrast set + question forms.
 * Prompts are always full sentences — never naked conjugation tables.
 */

export type PersonCode = "1s" | "2s" | "3s" | "1p" | "3p";

export const PERSONS: PersonCode[] = ["1s", "2s", "3s", "1p", "3p"];

export const PRONOUN_EN: Record<PersonCode, string> = {
  "1s": "I",
  "2s": "You",
  "3s": "She",
  "1p": "We",
  "3p": "They",
};

// Acceptable subject-pronoun prefixes per person (answers with or without pronoun are correct)
export const PRONOUN_ES: Record<PersonCode, string[]> = {
  "1s": ["yo"],
  "2s": ["tú"],
  "3s": ["ella", "él", "usted"],
  "1p": ["nosotros", "nosotras"],
  "3p": ["ellos", "ellas", "ustedes"],
};

export const PERSON_LABEL_ES: Record<PersonCode, string> = {
  "1s": "yo",
  "2s": "tú",
  "3s": "ella",
  "1p": "nosotros",
  "3p": "ellos",
};

export interface VerbDef {
  lemma: string;
  en: string; // infinitive gloss
  order: number;
  forms: Record<PersonCode, string>;
  frame: {
    esRest: string; // "un perro" -> "Tengo un perro"
    enVerb: Record<PersonCode, string>; // have/has, am/is/are...
    enRest: string; // "a dog"
  };
}

export const VERBS: VerbDef[] = [
  {
    lemma: "ser",
    en: "to be (identity/origin)",
    order: 10,
    forms: { "1s": "soy", "2s": "eres", "3s": "es", "1p": "somos", "3p": "son" },
    frame: {
      esRest: "de México",
      enVerb: { "1s": "am", "2s": "are", "3s": "is", "1p": "are", "3p": "are" },
      enRest: "from Mexico",
    },
  },
  {
    lemma: "estar",
    en: "to be (state/location)",
    order: 20,
    forms: { "1s": "estoy", "2s": "estás", "3s": "está", "1p": "estamos", "3p": "están" },
    frame: {
      esRest: "en casa",
      enVerb: { "1s": "am", "2s": "are", "3s": "is", "1p": "are", "3p": "are" },
      enRest: "at home",
    },
  },
  {
    lemma: "tener",
    en: "to have",
    order: 30,
    forms: { "1s": "tengo", "2s": "tienes", "3s": "tiene", "1p": "tenemos", "3p": "tienen" },
    frame: {
      esRest: "un perro",
      enVerb: { "1s": "have", "2s": "have", "3s": "has", "1p": "have", "3p": "have" },
      enRest: "a dog",
    },
  },
  {
    lemma: "ir",
    en: "to go",
    order: 40,
    forms: { "1s": "voy", "2s": "vas", "3s": "va", "1p": "vamos", "3p": "van" },
    frame: {
      esRest: "al mercado",
      enVerb: { "1s": "go", "2s": "go", "3s": "goes", "1p": "go", "3p": "go" },
      enRest: "to the market",
    },
  },
  {
    lemma: "querer",
    en: "to want",
    order: 50,
    forms: { "1s": "quiero", "2s": "quieres", "3s": "quiere", "1p": "queremos", "3p": "quieren" },
    frame: {
      esRest: "más café",
      enVerb: { "1s": "want", "2s": "want", "3s": "wants", "1p": "want", "3p": "want" },
      enRest: "more coffee",
    },
  },
  {
    lemma: "poder",
    en: "to be able to / can",
    order: 60,
    forms: { "1s": "puedo", "2s": "puedes", "3s": "puede", "1p": "podemos", "3p": "pueden" },
    frame: {
      esRest: "ayudar",
      enVerb: { "1s": "can", "2s": "can", "3s": "can", "1p": "can", "3p": "can" },
      enRest: "help",
    },
  },
  {
    lemma: "hacer",
    en: "to do / to make",
    order: 70,
    forms: { "1s": "hago", "2s": "haces", "3s": "hace", "1p": "hacemos", "3p": "hacen" },
    frame: {
      esRest: "la cena",
      enVerb: { "1s": "make", "2s": "make", "3s": "makes", "1p": "make", "3p": "make" },
      enRest: "dinner",
    },
  },
  {
    lemma: "necesitar",
    en: "to need",
    order: 80,
    forms: {
      "1s": "necesito",
      "2s": "necesitas",
      "3s": "necesita",
      "1p": "necesitamos",
      "3p": "necesitan",
    },
    frame: {
      esRest: "más tiempo",
      enVerb: { "1s": "need", "2s": "need", "3s": "needs", "1p": "need", "3p": "need" },
      enRest: "more time",
    },
  },
];

export interface PatternPrompt {
  type: "en_cue" | "question";
  text: string;
  expected: string;
  accepted: string[];
}

export interface PatternDef {
  key: string;
  es: string; // canonical chunk shown in briefs
  en: string;
  order: number;
  prompts: PatternPrompt[];
}

export const PATTERNS: PatternDef[] = [
  {
    key: "tener_que",
    es: "tener que + infinitivo",
    en: "to have to (obligation)",
    order: 35,
    prompts: [
      {
        type: "en_cue",
        text: "I have to leave.",
        expected: "tengo que irme",
        accepted: ["tengo que irme", "me tengo que ir", "tengo que salir"],
      },
      {
        type: "en_cue",
        text: "You have to work tomorrow.",
        expected: "tienes que trabajar mañana",
        accepted: ["tienes que trabajar mañana", "mañana tienes que trabajar"],
      },
      {
        type: "en_cue",
        text: "We have to eat something.",
        expected: "tenemos que comer algo",
        accepted: ["tenemos que comer algo"],
      },
    ],
  },
  {
    key: "ir_a",
    es: "ir a + infinitivo",
    en: "going to (near future)",
    order: 45,
    prompts: [
      {
        type: "en_cue",
        text: "I am going to eat now.",
        expected: "voy a comer ahora",
        accepted: ["voy a comer ahora", "ahora voy a comer"],
      },
      {
        type: "en_cue",
        text: "We are going to speak tomorrow.",
        expected: "vamos a hablar mañana",
        accepted: ["vamos a hablar mañana", "mañana vamos a hablar"],
      },
      {
        type: "en_cue",
        text: "She is going to buy a car.",
        expected: "va a comprar un coche",
        accepted: ["va a comprar un coche", "ella va a comprar un coche", "va a comprar un carro", "ella va a comprar un carro", "va a comprar un auto"],
      },
    ],
  },
  {
    key: "querer_inf",
    es: "querer + infinitivo",
    en: "to want to do sth",
    order: 55,
    prompts: [
      {
        type: "en_cue",
        text: "She wants to eat.",
        expected: "quiere comer",
        accepted: ["quiere comer", "ella quiere comer"],
      },
      {
        type: "en_cue",
        text: "I want to learn Spanish.",
        expected: "quiero aprender español",
        accepted: ["quiero aprender español"],
      },
    ],
  },
  {
    key: "poder_inf",
    es: "poder + infinitivo",
    en: "can do sth",
    order: 65,
    prompts: [
      {
        type: "question",
        text: "Ask a friend: Can you help me?",
        expected: "¿puedes ayudarme?",
        accepted: ["puedes ayudarme", "me puedes ayudar", "puedes ayudarme por favor"],
      },
      {
        type: "en_cue",
        text: "I can't go today.",
        expected: "no puedo ir hoy",
        accepted: ["no puedo ir hoy", "hoy no puedo ir"],
      },
    ],
  },
  {
    key: "necesitar_inf",
    es: "necesitar + infinitivo",
    en: "to need to do sth",
    order: 85,
    prompts: [
      {
        type: "en_cue",
        text: "I need to sleep.",
        expected: "necesito dormir",
        accepted: ["necesito dormir"],
      },
    ],
  },
  {
    key: "me_gusta",
    es: "me gusta + sustantivo/infinitivo",
    en: "I like (sing./activity)",
    order: 90,
    prompts: [
      {
        type: "en_cue",
        text: "I like coffee.",
        expected: "me gusta el café",
        accepted: ["me gusta el café"],
      },
      {
        type: "en_cue",
        text: "I like to read.",
        expected: "me gusta leer",
        accepted: ["me gusta leer"],
      },
    ],
  },
  {
    key: "me_gustan",
    es: "me gustan + plural",
    en: "I like (plural)",
    order: 95,
    prompts: [
      {
        type: "en_cue",
        text: "I like dogs.",
        expected: "me gustan los perros",
        accepted: ["me gustan los perros"],
      },
    ],
  },
  {
    key: "me_llamo",
    es: "me llamo...",
    en: "my name is...",
    order: 12,
    prompts: [
      {
        type: "en_cue",
        text: "My name is Ana.",
        expected: "me llamo ana",
        accepted: ["me llamo ana", "mi nombre es ana"],
      },
    ],
  },
  {
    key: "me_voy",
    es: "me voy",
    en: "I'm leaving",
    order: 47,
    prompts: [
      {
        type: "en_cue",
        text: "I'm leaving.",
        expected: "me voy",
        accepted: ["me voy", "ya me voy"],
      },
    ],
  },
  {
    key: "hay",
    es: "hay + sustantivo",
    en: "there is / there are",
    order: 25,
    prompts: [
      {
        type: "en_cue",
        text: "There is a problem.",
        expected: "hay un problema",
        accepted: ["hay un problema"],
      },
      {
        type: "en_cue",
        text: "There are two rooms.",
        expected: "hay dos habitaciones",
        accepted: ["hay dos habitaciones", "hay dos cuartos"],
      },
    ],
  },
  {
    key: "tengo_hambre",
    es: "tengo hambre / sed",
    en: "I'm hungry / thirsty (with tener)",
    order: 37,
    prompts: [
      {
        type: "en_cue",
        text: "I am hungry.",
        expected: "tengo hambre",
        accepted: ["tengo hambre"],
      },
      {
        type: "en_cue",
        text: "I am thirsty.",
        expected: "tengo sed",
        accepted: ["tengo sed"],
      },
    ],
  },
  {
    key: "donde_esta",
    es: "¿dónde está...?",
    en: "where is...?",
    order: 27,
    prompts: [
      {
        type: "question",
        text: "Ask: Where is the bathroom?",
        expected: "¿dónde está el baño?",
        accepted: ["dónde está el baño", "donde está el baño"],
      },
    ],
  },
  {
    key: "cuanto_cuesta",
    es: "¿cuánto cuesta?",
    en: "how much does it cost?",
    order: 97,
    prompts: [
      {
        type: "question",
        text: "Ask: How much does it cost?",
        expected: "¿cuánto cuesta?",
        accepted: ["cuánto cuesta", "cuánto es"],
      },
    ],
  },
  {
    key: "acabo_de",
    es: "acabar de + infinitivo",
    en: "to have just done sth",
    order: 100,
    prompts: [
      {
        type: "en_cue",
        text: "I just ate.",
        expected: "acabo de comer",
        accepted: ["acabo de comer"],
      },
    ],
  },
  {
    key: "q_tienes",
    es: "¿tienes...?",
    en: "do you have...?",
    order: 38,
    prompts: [
      {
        type: "question",
        text: "Ask a friend: Do you have time?",
        expected: "¿tienes tiempo?",
        accepted: ["tienes tiempo"],
      },
    ],
  },
  {
    key: "q_quieres",
    es: "¿quieres...?",
    en: "do you want...?",
    order: 57,
    prompts: [
      {
        type: "question",
        text: "Ask a friend: Do you want to go?",
        expected: "¿quieres ir?",
        accepted: ["quieres ir"],
      },
    ],
  },
];

/** ser/estar contrast set — attached to the verb_form items of the expected verb */
export interface ContrastPrompt {
  lemma: "ser" | "estar";
  person: PersonCode;
  text: string;
  expected: string;
  accepted: string[];
}

export const SER_ESTAR_CONTRASTS: ContrastPrompt[] = [
  {
    lemma: "ser",
    person: "1s",
    text: "I am a doctor. (profession → ser or estar?)",
    expected: "soy médico",
    accepted: ["soy médico", "soy médica", "soy doctor", "soy doctora"],
  },
  {
    lemma: "estar",
    person: "1s",
    text: "I am tired. (state → ser or estar?)",
    expected: "estoy cansado",
    accepted: ["estoy cansado", "estoy cansada"],
  },
  {
    lemma: "ser",
    person: "3s",
    text: "She is my sister. (identity → ser or estar?)",
    expected: "es mi hermana",
    accepted: ["es mi hermana", "ella es mi hermana"],
  },
  {
    lemma: "estar",
    person: "3s",
    text: "She is sick today. (state → ser or estar?)",
    expected: "está enferma hoy",
    accepted: ["está enferma hoy", "ella está enferma hoy", "hoy está enferma"],
  },
  {
    lemma: "estar",
    person: "3s",
    text: "The coffee is cold. (state → ser or estar?)",
    expected: "el café está frío",
    accepted: ["el café está frío", "está frío el café"],
  },
  {
    lemma: "ser",
    person: "3s",
    text: "He is tall. (trait → ser or estar?)",
    expected: "es alto",
    accepted: ["es alto", "él es alto"],
  },
  {
    lemma: "estar",
    person: "1p",
    text: "We are happy right now. (current state → ser or estar?)",
    expected: "estamos contentos",
    accepted: ["estamos contentos", "estamos contentas", "estamos felices"],
  },
  {
    lemma: "ser",
    person: "3p",
    text: "They are teachers. (profession → ser or estar?)",
    expected: "son maestros",
    accepted: ["son maestros", "son maestras", "son profesores", "son profesoras", "ellos son maestros"],
  },
];

/** Person-swap transformation pairs generated per verb: [from, to] */
export const TRANSFORM_PAIRS: [PersonCode, PersonCode][] = [
  ["1s", "2s"],
  ["1s", "3s"],
  ["2s", "1s"],
  ["3s", "1p"],
  ["1p", "3p"],
];
