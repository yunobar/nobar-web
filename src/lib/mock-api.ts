import type {
  GroupHistoryEntry,
  GroupHistoryEntryResolved,
  HistoryEntry,
  HistoryEntryResolved,
  Priority,
  SessionRecord,
  SessionRecordResolved,
  Title,
  User,
  WatchlistItem,
} from "@/types/domain";

export const ME_ID = "u1";

function delay<T>(value: T, ms = 220): Promise<T> {
  const jitter = Math.random() * 120;
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), ms + jitter),
  );
}

// ---------------------------------------------------------------------------
// Seed data — mirrors the Nobar design prototype's in-memory demo dataset.
// ---------------------------------------------------------------------------

interface Db {
  users: Record<string, User>;
  catalog: Record<string, Title>;
  watchlists: Record<string, WatchlistItem[]>;
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
    t2: { id: "t2", title: "The Bear", type: "tv", year: 2023 },
    t3: { id: "t3", title: "Severance", type: "tv", year: 2022 },
    t4: {
      id: "t4",
      title: "Everything Everywhere All at Once",
      type: "movie",
      year: 2022,
    },
    t5: { id: "t5", title: "Shōgun", type: "tv", year: 2024 },
    t6: { id: "t6", title: "Past Lives", type: "movie", year: 2023 },
    t7: { id: "t7", title: "Oppenheimer", type: "movie", year: 2023 },
    t8: { id: "t8", title: "Arcane", type: "tv", year: 2021 },
    t9: { id: "t9", title: "Poor Things", type: "movie", year: 2023 },
    t10: { id: "t10", title: "Blue Eye Samurai", type: "tv", year: 2023 },
    t11: { id: "t11", title: "The Wild Robot", type: "movie", year: 2024 },
    t12: { id: "t12", title: "Anatomy of a Fall", type: "movie", year: 2023 },
    x1: { id: "x1", title: "Parasite", type: "movie", year: 2019 },
    x2: { id: "x2", title: "Chernobyl", type: "tv", year: 2019 },
  };
  const wl = (
    tid: string,
    priority: Priority,
    notes: string,
    dateAdded: string,
  ): WatchlistItem => ({
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
    {
      gid: "g1",
      tid: "x2",
      date: "Jun 14",
      participantIds: ["u1", "u2", "u3"],
      via: "session",
    },
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
  return {
    users,
    catalog,
    watchlists,
    history,
    groupHistory,
    sessions,
  };
}

const db: Db = seed();

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
// Group history / past sessions (Layer-3 Watch Ledger, not built yet)
// ---------------------------------------------------------------------------

export async function getGroupHistory(
  gid: string,
): Promise<GroupHistoryEntryResolved[]> {
  const entries = db.groupHistory
    .filter((h) => h.gid === gid)
    .map((h) => ({
      ...db.catalog[h.tid],
      gid: h.gid,
      date: h.date,
      participantIds: h.participantIds,
      via: h.via,
    }));
  return delay(entries);
}

export async function getGroupSessions(
  gid: string,
): Promise<SessionRecordResolved[]> {
  const sessions = db.sessions
    .filter((s) => s.gid === gid)
    .map((s) => ({ ...s, winnerTitle: db.catalog[s.winnerTid]?.title ?? "" }));
  return delay(sessions);
}

export async function getHistory(
  userId: string,
): Promise<HistoryEntryResolved[]> {
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
