import type { DecisionMethod, Priority } from "@/types/domain";

export const PRIORITY_META: Record<Priority, { label: string; weight: number }> = {
  must: { label: "Must Watch", weight: 4 },
  high: { label: "High", weight: 3 },
  medium: { label: "Medium", weight: 2 },
  low: { label: "Low", weight: 1 },
};

/** Display label for the backend's content type ("tv" reads as "Series"). */
export function contentTypeLabel(type: "movie" | "tv"): string {
  return type === "movie" ? "Movie" : "Series";
}

export interface MethodMeta {
  label: string;
  icon: string;
  desc: string;
}

export const METHOD_META: Record<DecisionMethod, MethodMeta> = {
  ranked: {
    label: "Rank our favorites",
    icon: "⇅",
    desc: "Everyone lines up their picks — we land on what makes the most people happy.",
  },
  majority: {
    label: "Everyone votes",
    icon: "✓",
    desc: "One vote each. The most-wanted title wins.",
  },
  priority: {
    label: "Most excited wins",
    icon: "★",
    desc: "We add up how badly everyone wants each title.",
  },
  roundRobin: {
    label: "Take turns",
    icon: "↻",
    desc: "It’s someone’s turn to choose tonight. We remember who’s next.",
  },
  random: {
    label: "Surprise us",
    icon: "🎲",
    desc: "Can’t decide? Let chance pick from what you all want.",
  },
};
