import { activeLang, LANG_META } from "@/lib/lang";
import { activeProvider } from "@/lib/llm";
import { curriculumState, pendingItems } from "@/lib/factory";
import CurriculumClient from "./CurriculumClient";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const lang = await activeLang();
  const state = curriculumState(lang);
  const pending = pendingItems(lang).map(({ item, prompts }) => ({
    id: item.id,
    type: item.type,
    lemma: item.lemma,
    tense: item.tense,
    person: item.person,
    form: item.es,
    en: item.en,
    prompts: prompts.map((p) => ({
      promptType: p.promptType,
      promptText: p.promptText,
      expected: p.expected,
    })),
  }));

  return (
    <CurriculumClient
      langName={LANG_META[lang].name}
      flag={LANG_META[lang].flag}
      initialState={state}
      initialPending={pending}
      provider={activeProvider()}
    />
  );
}
