import type {
  ContentType,
  DecisionMethod,
  Priority,
  RankedRound,
  WatchlistItem,
} from "@/types/domain";

export const PRIORITY_META: Record<Priority, { label: string; weight: number }> = {
  must: { label: "Must Watch", weight: 4 },
  high: { label: "High", weight: 3 },
  medium: { label: "Medium", weight: 2 },
  low: { label: "Low", weight: 1 },
};

export function priorityWeight(p: Priority): number {
  return PRIORITY_META[p].weight;
}

export function typeLabel(type: ContentType): string {
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
  roundrobin: {
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

/** Orders candidates by how much a user (deterministically) wants them, using their stored watchlist priority. */
export function presetBallot(
  watchlist: WatchlistItem[],
  candidateIds: string[]
): string[] {
  const weightByTid = new Map<string, number>();
  watchlist.forEach((it) => weightByTid.set(it.tid, priorityWeight(it.priority)));
  return [...candidateIds].sort(
    (a, b) =>
      (weightByTid.get(b) ?? 0) - (weightByTid.get(a) ?? 0) ||
      candidateIds.indexOf(a) - candidateIds.indexOf(b)
  );
}

/** Instant-runoff voting over a set of ranked ballots. */
export function runIRV(
  ballots: string[][],
  candidateIds: string[]
): { winnerId: string; rounds: RankedRound[] } {
  let remaining = [...candidateIds];
  const rounds: RankedRound[] = [];
  while (true) {
    const tally: Record<string, number> = {};
    remaining.forEach((c) => (tally[c] = 0));
    ballots.forEach((b) => {
      const top = b.find((c) => remaining.includes(c));
      if (top != null) tally[top]++;
    });
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    const sorted = [...remaining].sort((a, b) => tally[b] - tally[a]);
    const leader = sorted[0];
    const round: RankedRound = { n: rounds.length + 1, tally: { ...tally }, remaining: [...remaining] };
    rounds.push(round);
    if (remaining.length <= 1 || tally[leader] > total / 2) {
      return { winnerId: leader, rounds };
    }
    const min = Math.min(...remaining.map((c) => tally[c]));
    const loser = [...remaining].reverse().find((c) => tally[c] === min)!;
    round.eliminated = loser;
    remaining = remaining.filter((c) => c !== loser);
  }
}

export function tallyVotes(
  votes: Record<string, string>,
  candidateIds: string[]
): { winnerId: string; tally: Record<string, number> } {
  const tally: Record<string, number> = {};
  candidateIds.forEach((c) => (tally[c] = 0));
  Object.values(votes).forEach((tid) => {
    if (tid != null) tally[tid] = (tally[tid] ?? 0) + 1;
  });
  const winnerId = [...candidateIds].sort((a, b) => tally[b] - tally[a])[0];
  return { winnerId, tally };
}

export function scoreByPriority(
  watchlistsByUser: Record<string, WatchlistItem[]>,
  participantIds: string[],
  candidateIds: string[]
): { winnerId: string; scores: Record<string, number> } {
  const scores: Record<string, number> = {};
  candidateIds.forEach((tid) => {
    let sum = 0;
    participantIds.forEach((uid) => {
      const it = (watchlistsByUser[uid] ?? []).find((i) => i.tid === tid);
      if (it) sum += priorityWeight(it.priority);
    });
    scores[tid] = sum;
  });
  const winnerId = [...candidateIds].sort((a, b) => scores[b] - scores[a])[0];
  return { winnerId, scores };
}
