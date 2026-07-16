export type Priority = "must" | "high" | "medium" | "low";
export type ContentType = "movie" | "tv";
export type DecisionMethod =
  | "ranked"
  | "majority"
  | "priority"
  | "roundRobin"
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
