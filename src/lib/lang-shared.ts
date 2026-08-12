export type Lang = "es" | "fr";

export const LANG_META: Record<
  Lang,
  { name: string; nameNative: string; tts: string; flag: string; characters: string }
> = {
  es: {
    name: "Spanish",
    nameNative: "español",
    tts: "es-MX",
    flag: "🇲🇽",
    characters: "Ana and her friend Luz",
  },
  fr: {
    name: "French",
    nameNative: "français",
    tts: "fr-FR",
    flag: "🇫🇷",
    characters: "Léa and her friend Hugo",
  },
};

export const LANG_COOKIE = "fluent.lang";
