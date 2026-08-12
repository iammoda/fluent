/**
 * Answer normalization + grading.
 * Two levels: strict (accents kept) and loose (accents stripped, ñ preserved).
 * Accent-only mismatch => correct, but flagged errorType 'accent'.
 */

const NNN = "\u0001"; // placeholder to protect ñ from diacritic stripping

export function normStrict(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019\u2018\u02bc]/g, "'") // typographic apostrophes -> straight
    .replace(/'/g, "") // elision joins: j'ai -> jai (matches however the user types it)
    .replace(/[¿¡?!.,;:"()«»…-]/g, " ") // other punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

export function normLoose(s: string): string {
  return normStrict(s)
    .replaceAll("ñ", NNN)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(NNN, "ñ");
}

export interface GradeResult {
  correct: boolean;
  accentOnly: boolean; // correct content, wrong/missing accents
}

export function gradeAnswer(answer: string, accepted: string[]): GradeResult {
  const aStrict = normStrict(answer);
  const aLoose = normLoose(answer);
  for (const acc of accepted) {
    if (normStrict(acc) === aStrict) return { correct: true, accentOnly: false };
  }
  for (const acc of accepted) {
    if (normLoose(acc) === aLoose) return { correct: true, accentOnly: true };
  }
  return { correct: false, accentOnly: false };
}

export function tokens(s: string): string[] {
  return normLoose(s).split(" ").filter(Boolean);
}
