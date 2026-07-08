export type Priority = "must" | "high" | "medium" | "low";
export type ContentType = "movie" | "series";
export type DecisionMethod =
  | "ranked"
  | "majority"
  | "priority"
  | "roundrobin"
  | "random";
export type AddedVia = "session" | "manual";

export interface User {
  id: string;
  name: string;
  initials: string;
  hue: number;
}

export interface Title {
  id: string;
  title: string;
  type: ContentType;
  year: number;
}

export interface WatchlistItem {
  tid: string;
  priority: Priority;
  notes: string;
  dateAdded: string;
}

export interface WatchlistEntry extends Title {
  priority: Priority;
  notes: string;
  dateAdded: string;
}

export interface MergedEntry extends Title {
  entries: { uid: string; priority: Priority }[];
}

export interface GroupPick {
  tid: string;
  method: DecisionMethod;
  participantIds: string[];
  date: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  rotationIndex: number;
  currentPick: GroupPick | null;
}

export interface GroupSummary extends Group {
  titleCount: number;
  sessionCount: number;
}

export interface HistoryEntry {
  tid: string;
  date: string;
  groupId: string | null;
  via: AddedVia;
}

export interface HistoryEntryResolved extends Title {
  date: string;
  groupId: string | null;
  via: AddedVia;
}

export interface GroupHistoryEntry {
  gid: string;
  tid: string;
  date: string;
  participantIds: string[];
  via: AddedVia;
}

export interface GroupHistoryEntryResolved extends Title {
  gid: string;
  date: string;
  participantIds: string[];
  via: AddedVia;
}

export interface SessionRecord {
  id: string;
  gid: string;
  name: string;
  method: DecisionMethod;
  date: string;
  status: "done";
  winnerTid: string;
  participantIds: string[];
}

export interface SessionRecordResolved extends SessionRecord {
  winnerTitle: string;
}

export interface RankedRound {
  n: number;
  tally: Record<string, number>;
  remaining: string[];
  eliminated?: string;
}

export interface LiveSessionResult {
  winnerTid: string;
  rounds?: RankedRound[];
  tally?: Record<string, number>;
  scores?: Record<string, number>;
}

export interface LiveSessionParticipantProgress {
  uid: string;
  locked: boolean;
}

export type LiveSessionStatus = "collecting" | "revealed";

export interface LiveSessionPublic {
  id: string;
  gid: string;
  name: string;
  method: DecisionMethod;
  participantIds: string[];
  candidateIds: string[];
  status: LiveSessionStatus;
  progress: LiveSessionParticipantProgress[];
  result?: LiveSessionResult;
  myRanking?: string[];
  roundRobin?: { chooserUid: string; isMyTurn: boolean };
}
