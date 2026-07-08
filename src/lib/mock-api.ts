import type {
  DecisionMethod,
  Group,
  GroupHistoryEntry,
  GroupHistoryEntryResolved,
  GroupPick,
  GroupSummary,
  HistoryEntry,
  HistoryEntryResolved,
  LiveSessionPublic,
  LiveSessionResult,
  MergedEntry,
  Priority,
  SessionRecord,
  SessionRecordResolved,
  Title,
  User,
  WatchlistEntry,
  WatchlistItem,
} from "@/types/domain";
import { presetBallot, runIRV, scoreByPriority, tallyVotes } from "@/lib/decision-methods";

export const ME_ID = "u1";

function delay<T>(value: T, ms = 220): Promise<T> {
  const jitter = Math.random() * 120;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms + jitter));
}

function nextId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// ---------------------------------------------------------------------------
// Seed data — mirrors the Nobar design prototype's in-memory demo dataset.
// ---------------------------------------------------------------------------

interface Db {
  users: Record<string, User>;
  catalog: Record<string, Title>;
  watchlists: Record<string, WatchlistItem[]>;
  groups: Group[];
  history: Record<string, HistoryEntry[]>;
  groupHistory: GroupHistoryEntry[];
  sessions: SessionRecord[];
}

function seed(): Db {
  const users: Record<string, User> = {
    u1: { id: "u1", name: "Alex", initials: "AL", hue: 285 },
    u2: { id: "u2", name: "Mira", initials: "MI", hue: 15 },
    u3: { id: "u3", name: "Devon", initials: "DE", hue: 155 },
    u4: { id: "u4", name: "Priya", initials: "PR", hue: 70 },
    u5: { id: "u5", name: "Sam", initials: "SA", hue: 235 },
  };
  const catalog: Record<string, Title> = {
    t1: { id: "t1", title: "Dune: Part Two", type: "movie", year: 2024 },
    t2: { id: "t2", title: "The Bear", type: "series", year: 2023 },
    t3: { id: "t3", title: "Severance", type: "series", year: 2022 },
    t4: { id: "t4", title: "Everything Everywhere All at Once", type: "movie", year: 2022 },
    t5: { id: "t5", title: "Shōgun", type: "series", year: 2024 },
    t6: { id: "t6", title: "Past Lives", type: "movie", year: 2023 },
    t7: { id: "t7", title: "Oppenheimer", type: "movie", year: 2023 },
    t8: { id: "t8", title: "Arcane", type: "series", year: 2021 },
    t9: { id: "t9", title: "Poor Things", type: "movie", year: 2023 },
    t10: { id: "t10", title: "Blue Eye Samurai", type: "series", year: 2023 },
    t11: { id: "t11", title: "The Wild Robot", type: "movie", year: 2024 },
    t12: { id: "t12", title: "Anatomy of a Fall", type: "movie", year: 2023 },
    x1: { id: "x1", title: "Parasite", type: "movie", year: 2019 },
    x2: { id: "x2", title: "Chernobyl", type: "series", year: 2019 },
  };
  const wl = (tid: string, priority: Priority, notes: string, dateAdded: string): WatchlistItem => ({
    tid,
    priority,
    notes: notes || "",
    dateAdded,
  });
  const watchlists: Record<string, WatchlistItem[]> = {
    u1: [
      wl("t3", "must", "Everyone keeps telling me to finish s1", "Jun 28"),
      wl("t1", "high", "", "Jun 24"),
      wl("t5", "high", "", "Jun 20"),
      wl("t7", "medium", "Long — need a free evening", "Jun 12"),
      wl("t9", "low", "", "May 30"),
    ],
    u2: [
      wl("t2", "must", "", "Jun 27"),
      wl("t5", "high", "", "Jun 22"),
      wl("t6", "high", "", "Jun 18"),
      wl("t1", "medium", "", "Jun 10"),
      wl("t12", "medium", "", "Jun 2"),
    ],
    u3: [
      wl("t5", "must", "", "Jun 26"),
      wl("t7", "high", "", "Jun 21"),
      wl("t3", "high", "", "Jun 15"),
      wl("t4", "medium", "", "Jun 8"),
      wl("t11", "low", "", "May 28"),
    ],
    u4: [
      wl("t8", "must", "", "Jun 25"),
      wl("t10", "high", "", "Jun 19"),
      wl("t4", "high", "", "Jun 11"),
      wl("t5", "medium", "", "Jun 3"),
    ],
    u5: [
      wl("t10", "must", "", "Jun 24"),
      wl("t8", "high", "", "Jun 17"),
      wl("t2", "medium", "", "Jun 9"),
      wl("t1", "low", "", "May 29"),
    ],
  };
  const groups: Group[] = [
    { id: "g1", name: "Apartment 4B", memberIds: ["u1", "u2", "u3"], rotationIndex: 0, currentPick: null },
    { id: "g2", name: "Anime Club", memberIds: ["u1", "u4", "u5"], rotationIndex: 1, currentPick: null },
  ];
  const history: Record<string, HistoryEntry[]> = {
    u1: [
      { tid: "x1", date: "Jun 20", groupId: null, via: "manual" },
      { tid: "x2", date: "Jun 14", groupId: "g1", via: "session" },
    ],
    u2: [{ tid: "x2", date: "Jun 14", groupId: "g1", via: "session" }],
    u3: [{ tid: "x2", date: "Jun 14", groupId: "g1", via: "session" }],
    u4: [],
    u5: [],
  };
  const groupHistory: GroupHistoryEntry[] = [
    { gid: "g1", tid: "x2", date: "Jun 14", participantIds: ["u1", "u2", "u3"], via: "session" },
  ];
  const sessions: SessionRecord[] = [
    {
      id: "s0",
      gid: "g1",
      name: "Last Friday",
      method: "ranked",
      date: "Jun 14",
      status: "done",
      winnerTid: "x2",
      participantIds: ["u1", "u2", "u3"],
    },
  ];
  return { users, catalog, watchlists, groups, history, groupHistory, sessions };
}

/** Titles discoverable via search that may not yet exist in anyone's watchlist/catalog. */
const SEARCH_UNIVERSE: { title: string; type: "movie" | "series"; year: number }[] = [
  { title: "Dune: Part Two", type: "movie", year: 2024 },
  { title: "The Bear", type: "series", year: 2023 },
  { title: "Severance", type: "series", year: 2022 },
  { title: "Everything Everywhere All at Once", type: "movie", year: 2022 },
  { title: "Shōgun", type: "series", year: 2024 },
  { title: "Past Lives", type: "movie", year: 2023 },
  { title: "Oppenheimer", type: "movie", year: 2023 },
  { title: "Arcane", type: "series", year: 2021 },
  { title: "Poor Things", type: "movie", year: 2023 },
  { title: "Blue Eye Samurai", type: "series", year: 2023 },
  { title: "The Wild Robot", type: "movie", year: 2024 },
  { title: "Anatomy of a Fall", type: "movie", year: 2023 },
  { title: "Parasite", type: "movie", year: 2019 },
  { title: "Chernobyl", type: "series", year: 2019 },
  { title: "The Substance", type: "movie", year: 2024 },
  { title: "Ripley", type: "series", year: 2024 },
  { title: "Challengers", type: "movie", year: 2024 },
  { title: "Fallout", type: "series", year: 2024 },
  { title: "The Zone of Interest", type: "movie", year: 2023 },
  { title: "Baby Reindeer", type: "series", year: 2024 },
  { title: "La La Land", type: "movie", year: 2016 },
  { title: "Breaking Bad", type: "series", year: 2008 },
  { title: "Spirited Away", type: "movie", year: 2001 },
  { title: "The Last of Us", type: "series", year: 2023 },
  { title: "Whiplash", type: "movie", year: 2014 },
  { title: "Fleabag", type: "series", year: 2016 },
  { title: "Interstellar", type: "movie", year: 2014 },
  { title: "Succession", type: "series", year: 2018 },
  { title: "The Boys", type: "series", year: 2019 },
  { title: "Everything Now", type: "series", year: 2023 },
  { title: "Aftersun", type: "movie", year: 2022 },
  { title: "Frieren", type: "series", year: 2023 },
  { title: "The Holdovers", type: "movie", year: 2023 },
  { title: "Delicious in Dungeon", type: "series", year: 2024 },
  { title: "Perfect Days", type: "movie", year: 2023 },
];

const db: Db = seed();
const liveSessions = new Map<string, InternalLiveSession>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayLabel(): string {
  return "Jul 6";
}

function requireGroup(gid: string): Group {
  const g = db.groups.find((x) => x.id === gid);
  if (!g) throw new Error(`Group not found: ${gid}`);
  return g;
}

export function computeMerged(gid: string): MergedEntry[] {
  const g = requireGroup(gid);
  const map = new Map<string, MergedEntry>();
  g.memberIds.forEach((uid) => {
    (db.watchlists[uid] ?? []).forEach((it) => {
      const existing = map.get(it.tid);
      if (existing) {
        existing.entries.push({ uid, priority: it.priority });
      } else {
        map.set(it.tid, { ...db.catalog[it.tid], entries: [{ uid, priority: it.priority }] });
      }
    });
  });
  return [...map.values()].sort(
    (a, b) =>
      b.entries.length - a.entries.length ||
      b.entries.reduce((s, e) => s + weight(e.priority), 0) -
        a.entries.reduce((s, e) => s + weight(e.priority), 0)
  );
}

function weight(p: Priority): number {
  return { must: 4, high: 3, medium: 2, low: 1 }[p];
}

function finalizeWatched(gid: string, pick: GroupPick): void {
  const g = requireGroup(gid);
  const today = todayLabel();
  pick.participantIds.forEach((uid) => {
    db.history[uid] = [{ tid: pick.tid, date: today, groupId: gid, via: "session" }, ...(db.history[uid] ?? [])];
  });
  db.groupHistory = [
    { gid, tid: pick.tid, date: today, participantIds: [...pick.participantIds], via: "session" },
    ...db.groupHistory,
  ];
  db.sessions = [
    {
      id: nextId("s"),
      gid,
      name: "Movie night",
      method: pick.method,
      date: today,
      status: "done",
      winnerTid: pick.tid,
      participantIds: [...pick.participantIds],
    },
    ...db.sessions,
  ];
  g.currentPick = null;
  if (pick.method === "roundrobin") g.rotationIndex += 1;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<User> {
  return delay(db.users[ME_ID]);
}

export async function getUsers(): Promise<User[]> {
  return delay(Object.values(db.users));
}

// ---------------------------------------------------------------------------
// Catalog / search
// ---------------------------------------------------------------------------

export interface SearchResult {
  title: string;
  type: "movie" | "series";
  year: number;
  already: boolean;
}

export async function searchTitles(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return delay([], 60);
  const owned = new Set(
    (db.watchlists[ME_ID] ?? []).map((i) => db.catalog[i.tid]?.title.toLowerCase())
  );
  const results = SEARCH_UNIVERSE.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 12);
  return delay(
    results.map((r) => ({ ...r, already: owned.has(r.title.toLowerCase()) })),
    260
  );
}

function findOrCreateCatalogEntry(entry: { title: string; type: "movie" | "series"; year: number }): Title {
  const existing = Object.values(db.catalog).find(
    (c) => c.title.toLowerCase() === entry.title.toLowerCase()
  );
  if (existing) return existing;
  const id = nextId("c");
  const title: Title = { id, title: entry.title, type: entry.type, year: entry.year };
  db.catalog[id] = title;
  return title;
}

// ---------------------------------------------------------------------------
// Personal watchlist
// ---------------------------------------------------------------------------

export async function getWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const items = (db.watchlists[userId] ?? []).map((it) => ({ ...db.catalog[it.tid], ...it }));
  return delay(items);
}

export async function addWatchlistItem(
  userId: string,
  entry: { title: string; type: "movie" | "series"; year: number },
  priority: Priority,
  notes: string
): Promise<void> {
  const title = findOrCreateCatalogEntry(entry);
  db.watchlists[userId] = [
    { tid: title.id, priority, notes: notes.trim(), dateAdded: "Today" },
    ...(db.watchlists[userId] ?? []),
  ];
  return delay(undefined, 260);
}

export async function removeWatchlistItem(userId: string, tid: string): Promise<void> {
  db.watchlists[userId] = (db.watchlists[userId] ?? []).filter((i) => i.tid !== tid);
  return delay(undefined, 150);
}

export async function updateWatchlistItemPriority(
  userId: string,
  tid: string,
  priority: Priority
): Promise<void> {
  db.watchlists[userId] = (db.watchlists[userId] ?? []).map((i) =>
    i.tid === tid ? { ...i, priority } : i
  );
  return delay(undefined, 150);
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function getGroupSummaries(): Promise<GroupSummary[]> {
  const summaries = db.groups.map((g) => ({
    ...g,
    titleCount: computeMerged(g.id).length,
    sessionCount: db.sessions.filter((s) => s.gid === g.id).length,
  }));
  return delay(summaries);
}

export async function getGroup(gid: string): Promise<Group> {
  return delay({ ...requireGroup(gid) });
}

export async function createGroup(name: string, memberIds: string[]): Promise<Group> {
  const g: Group = {
    id: nextId("g"),
    name: name.trim(),
    memberIds: [ME_ID, ...memberIds],
    rotationIndex: 0,
    currentPick: null,
  };
  db.groups = [...db.groups, g];
  return delay(g, 300);
}

export async function getMergedWatchlist(gid: string): Promise<MergedEntry[]> {
  return delay(computeMerged(gid));
}

export async function getGroupHistory(gid: string): Promise<GroupHistoryEntryResolved[]> {
  const entries = db.groupHistory
    .filter((h) => h.gid === gid)
    .map((h) => ({ ...db.catalog[h.tid], gid: h.gid, date: h.date, participantIds: h.participantIds, via: h.via }));
  return delay(entries);
}

export async function getGroupSessions(gid: string): Promise<SessionRecordResolved[]> {
  const sessions = db.sessions
    .filter((s) => s.gid === gid)
    .map((s) => ({ ...s, winnerTitle: db.catalog[s.winnerTid]?.title ?? "" }));
  return delay(sessions);
}

export async function getHistory(userId: string): Promise<HistoryEntryResolved[]> {
  const entries = (db.history[userId] ?? []).map((h) => ({
    ...db.catalog[h.tid],
    date: h.date,
    groupId: h.groupId,
    via: h.via,
  }));
  return delay(entries);
}

export async function getTitle(tid: string): Promise<Title> {
  return delay(db.catalog[tid]);
}

export async function markWatchedManually(
  gid: string | null,
  tid: string,
  participantIds: string[]
): Promise<void> {
  const today = todayLabel();
  participantIds.forEach((uid) => {
    db.history[uid] = [{ tid, date: today, groupId: gid, via: "manual" }, ...(db.history[uid] ?? [])];
  });
  if (gid) {
    db.groupHistory = [
      { gid, tid, date: today, participantIds: [...participantIds], via: "manual" },
      ...db.groupHistory,
    ];
  }
  return delay(undefined, 260);
}

export async function completeGroupPick(gid: string): Promise<void> {
  const g = requireGroup(gid);
  if (!g.currentPick) return delay(undefined);
  finalizeWatched(gid, g.currentPick);
  return delay(undefined, 260);
}

export async function clearGroupPick(gid: string): Promise<void> {
  requireGroup(gid).currentPick = null;
  return delay(undefined, 120);
}

// ---------------------------------------------------------------------------
// Live decision sessions
// ---------------------------------------------------------------------------

interface InternalLiveSession {
  id: string;
  gid: string;
  name: string;
  method: DecisionMethod;
  participantIds: string[];
  candidateIds: string[];
  locked: Record<string, boolean>;
  // stored submissions, kept private until revealed
  rankings: Record<string, string[]>;
  votes: Record<string, string>;
  status: "collecting" | "revealed";
  result?: LiveSessionResult;
  roundRobin?: { chooserUid: string };
  myInitialRanking?: string[];
}

function toPublic(s: InternalLiveSession): LiveSessionPublic {
  const pub: LiveSessionPublic = {
    id: s.id,
    gid: s.gid,
    name: s.name,
    method: s.method,
    participantIds: s.participantIds,
    candidateIds: s.candidateIds,
    status: s.status,
    progress: s.participantIds.map((uid) => ({ uid, locked: !!s.locked[uid] })),
    result: s.status === "revealed" ? s.result : undefined,
  };
  if (s.method === "ranked" && !s.locked[ME_ID]) {
    pub.myRanking = s.myInitialRanking;
  }
  if (s.method === "roundrobin" && s.roundRobin) {
    pub.roundRobin = { chooserUid: s.roundRobin.chooserUid, isMyTurn: s.roundRobin.chooserUid === ME_ID };
  }
  return pub;
}

function maybeReveal(s: InternalLiveSession): void {
  if (s.status === "revealed") return;
  const allLocked = s.participantIds.every((uid) => s.locked[uid]);
  if (!allLocked) return;
  if (s.method === "ranked") {
    const ballots = s.participantIds.map((uid) => s.rankings[uid]);
    const { winnerId, rounds } = runIRV(ballots, s.candidateIds);
    s.result = { winnerTid: winnerId, rounds };
  } else if (s.method === "majority") {
    const { winnerId, tally } = tallyVotes(s.votes, s.candidateIds);
    s.result = { winnerTid: winnerId, tally };
  } else if (s.method === "priority") {
    const { winnerId, scores } = scoreByPriority(db.watchlists, s.participantIds, s.candidateIds);
    s.result = { winnerTid: winnerId, scores };
  }
  s.status = "revealed";
  const g = requireGroup(s.gid);
  g.currentPick = {
    tid: s.result!.winnerTid,
    method: s.method,
    participantIds: [...s.participantIds],
    date: todayLabel(),
  };
}

/** Schedules the non-current-user participants to "lock in" one by one, for suspense. */
function scheduleSimulatedLockIns(s: InternalLiveSession): void {
  const others = s.participantIds.filter((uid) => uid !== ME_ID);
  others.forEach((uid, i) => {
    const delayMs = 550 + i * 700 + Math.random() * 300;
    setTimeout(() => {
      const live = liveSessions.get(s.id);
      if (!live || live.status === "revealed") return;
      if (live.method === "ranked") {
        live.rankings[uid] = presetBallot(db.watchlists[uid] ?? [], live.candidateIds);
      } else if (live.method === "majority") {
        live.votes[uid] = presetBallot(db.watchlists[uid] ?? [], live.candidateIds)[0];
      }
      live.locked[uid] = true;
      maybeReveal(live);
    }, delayMs);
  });
}

export async function startLiveSession(params: {
  gid: string;
  name: string;
  method: DecisionMethod;
  participantIds: string[];
  candidateIds: string[];
}): Promise<LiveSessionPublic> {
  const { gid, name, method, participantIds, candidateIds } = params;
  const id = nextId("ls");
  const s: InternalLiveSession = {
    id,
    gid,
    name,
    method,
    participantIds,
    candidateIds,
    locked: {},
    rankings: {},
    votes: {},
    status: "collecting",
  };
  participantIds.forEach((uid) => (s.locked[uid] = false));

  if (method === "ranked") {
    s.myInitialRanking = presetBallot(db.watchlists[ME_ID] ?? [], candidateIds);
    scheduleSimulatedLockIns(s);
  } else if (method === "majority") {
    scheduleSimulatedLockIns(s);
  } else if (method === "priority") {
    scheduleSimulatedLockIns(s);
  } else if (method === "roundrobin") {
    const g = requireGroup(gid);
    const chooserUid = participantIds[g.rotationIndex % participantIds.length];
    s.roundRobin = { chooserUid };
  } else if (method === "random") {
    // no locking phase; resolved via finalizeRandomPick
  }

  liveSessions.set(id, s);
  return delay(toPublic(s), 300);
}

export async function getLiveSession(id: string): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s) throw new Error("Session not found");
  return delay(toPublic(s), 90);
}

export async function submitRanking(id: string, ranking: string[]): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s) throw new Error("Session not found");
  s.rankings[ME_ID] = ranking;
  s.locked[ME_ID] = true;
  maybeReveal(s);
  return delay(toPublic(s), 150);
}

export async function submitVote(id: string, tid: string): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s) throw new Error("Session not found");
  s.votes[ME_ID] = tid;
  s.locked[ME_ID] = true;
  maybeReveal(s);
  return delay(toPublic(s), 150);
}

export async function submitReady(id: string): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s) throw new Error("Session not found");
  s.locked[ME_ID] = true;
  maybeReveal(s);
  return delay(toPublic(s), 150);
}

export async function pickRoundRobin(id: string, tid: string): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s) throw new Error("Session not found");
  s.result = { winnerTid: tid };
  s.status = "revealed";
  const g = requireGroup(s.gid);
  g.currentPick = { tid, method: "roundrobin", participantIds: [...s.participantIds], date: todayLabel() };
  return delay(toPublic(s), 200);
}

export async function simulateRoundRobin(id: string): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s || !s.roundRobin) throw new Error("Session not found");
  const tid = presetBallot(db.watchlists[s.roundRobin.chooserUid] ?? [], s.candidateIds)[0];
  return pickRoundRobin(id, tid);
}

export async function finalizeRandomPick(id: string): Promise<LiveSessionPublic> {
  const s = liveSessions.get(id);
  if (!s) throw new Error("Session not found");
  const tid = s.candidateIds[Math.floor(Math.random() * s.candidateIds.length)];
  s.result = { winnerTid: tid };
  s.status = "revealed";
  const g = requireGroup(s.gid);
  g.currentPick = { tid, method: "random", participantIds: [...s.participantIds], date: todayLabel() };
  return delay(toPublic(s), 200);
}

export async function completeLiveSession(id: string): Promise<void> {
  const s = liveSessions.get(id);
  if (!s || !s.result) return delay(undefined);
  finalizeWatched(s.gid, {
    tid: s.result.winnerTid,
    method: s.method,
    participantIds: s.participantIds,
    date: todayLabel(),
  });
  liveSessions.delete(id);
  return delay(undefined, 260);
}
