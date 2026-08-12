/** CEFR can-do self-assessment map — the visible path to "conversational". */

export interface CanDo {
  key: string;
  level: "A1" | "A2" | "B1";
  text: string;
}

export const CANDOS: CanDo[] = [
  // ---- A1 ----
  { key: "a1_greet", level: "A1", text: "Greet people, introduce myself, and say where I'm from" },
  { key: "a1_numbers", level: "A1", text: "Use numbers, prices, and tell the time" },
  { key: "a1_order", level: "A1", text: "Order food and drinks" },
  { key: "a1_have_want", level: "A1", text: "Say what I have, want, and need" },
  { key: "a1_questions", level: "A1", text: "Ask simple questions (where is…?, do you have…?)" },
  { key: "a1_likes", level: "A1", text: "Say what I like and don't like" },
  { key: "a1_family", level: "A1", text: "Describe my family and my work in simple terms" },
  { key: "a1_directions", level: "A1", text: "Ask for and roughly understand directions" },
  // ---- A2 ----
  { key: "a2_daily", level: "A2", text: "Describe my daily routine in connected sentences" },
  { key: "a2_past", level: "A2", text: "Talk about what I did yesterday / last weekend" },
  { key: "a2_plans", level: "A2", text: "Talk about plans and intentions (going to…)" },
  { key: "a2_shopping", level: "A2", text: "Handle shopping: sizes, colors, returns, comparisons" },
  { key: "a2_small_talk", level: "A2", text: "Make small talk about weather, weekend, work" },
  { key: "a2_invite", level: "A2", text: "Invite someone, accept and decline politely" },
  { key: "a2_problems", level: "A2", text: "Explain a simple problem (something's broken, I'm lost, I feel sick)" },
  { key: "a2_opinions", level: "A2", text: "Give a simple opinion and say why" },
  // ---- B1 ----
  { key: "b1_stories", level: "B1", text: "Tell a story about something that happened to me, with background and events" },
  { key: "b1_conversation", level: "B1", text: "Hold a 10-minute spontaneous conversation on familiar topics" },
  { key: "b1_feelings", level: "B1", text: "Describe feelings, hopes, and ambitions" },
  { key: "b1_disagree", level: "B1", text: "Disagree politely and negotiate (plans, prices, chores)" },
  { key: "b1_advice", level: "B1", text: "Give advice and make suggestions" },
  { key: "b1_media", level: "B1", text: "Follow the main points of a podcast/show made for natives on a familiar topic" },
  { key: "b1_repair", level: "B1", text: "Repair breakdowns: rephrase, ask for clarification, keep going" },
  { key: "b1_abstract", level: "B1", text: "Discuss a simple abstract topic (habits, culture, learning) for a few minutes" },
];

export const LEVEL_LABEL: Record<CanDo["level"], string> = {
  A1: "A1 — survival",
  A2: "A2 — everyday",
  B1: "B1 — conversational 🎯",
};
