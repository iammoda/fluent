/** Curated comprehensible-input sources — orchestrate, don't rebuild. */
import type { Lang } from "./lang-shared";

export interface InputSource {
  name: string;
  url: string;
  what: string;
}

export const INPUT_SOURCES: Record<Lang, InputSource[]> = {
  es: [
    { name: "Dreaming Spanish", url: "https://www.dreamingspanish.com", what: "video, superbeginner → advanced — the gold standard" },
    { name: "Cuéntame (Podcast)", url: "https://open.spotify.com/show/6ZAvYqXrJ8jHHBOJDGopUb", what: "slow beginner podcast, stories" },
    { name: "Extr@ en español", url: "https://www.youtube.com/results?search_query=extra+en+espa%C3%B1ol+episodio+1", what: "sitcom made for learners" },
    { name: "News in Slow Spanish", url: "https://www.newsinslowspanish.com", what: "current events, graded speed" },
    { name: "Hoy Hablamos", url: "https://www.hoyhablamos.com", what: "daily podcast (intermediate)" },
  ],
  fr: [
    { name: "InnerFrench", url: "https://innerfrench.com", what: "clear intermediate podcast — start early, it's gentle" },
    { name: "Extr@ French", url: "https://www.youtube.com/results?search_query=extra+french+episode+1", what: "sitcom made for learners" },
    { name: "Français Authentique", url: "https://www.francaisauthentique.com", what: "slow, clear French" },
    { name: "News in Slow French", url: "https://www.newsinslowfrench.com", what: "current events, graded speed" },
    { name: "Piece of French", url: "https://www.youtube.com/@PieceofFrench", what: "vlogs with subtitles" },
  ],
};
