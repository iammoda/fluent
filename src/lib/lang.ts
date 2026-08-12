import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "./lang-shared";

export { LANG_META, LANG_COOKIE, type Lang } from "./lang-shared";

export async function activeLang(): Promise<Lang> {
  const c = await cookies();
  return c.get(LANG_COOKIE)?.value === "fr" ? "fr" : "es";
}
