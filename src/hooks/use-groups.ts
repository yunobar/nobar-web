import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGroup as getMockGroup,
  getGroupHistory,
  getGroupSessions,
  getGroupSummaries,
  getMergedWatchlist as getMockMergedWatchlist,
  markWatchedManually,
} from "@/lib/mock-api";
import { createGroup, getGroup, getGroups, getMergedWatchlist, joinGroup, type MergedFilter } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// --- Real API: group management (/groups, /groups/$groupId, invite links) ------

export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups, queryFn: getGroups });
}

export function useGroup(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(gid ?? ""),
    queryFn: () => getGroup(gid!),
    enabled: !!gid,
  });
}

export function useMergedWatchlist(gid: string | undefined, filter: MergedFilter = "all") {
  return useQuery({
    queryKey: queryKeys.merged(gid ?? "", filter),
    queryFn: () => getMergedWatchlist(gid!, filter),
    enabled: !!gid,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) => createGroup(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => joinGroup(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

// --- Mock-backed: decision-session flow (/watch, session.tsx) ------------------
// ponytail: decision sessions have no real API yet (see group-merge-backend.md);
// keep these on mock-api until that module ships, then delete.

export function useMockGroups() {
  return useQuery({ queryKey: queryKeys.mockGroups, queryFn: getGroupSummaries });
}

export function useMockGroup(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mockGroup(gid ?? ""),
    queryFn: () => getMockGroup(gid!),
    enabled: !!gid,
  });
}

export function useMockMergedWatchlist(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mockMerged(gid ?? ""),
    queryFn: () => getMockMergedWatchlist(gid!),
    enabled: !!gid,
  });
}

export function useGroupHistory(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupHistory(gid ?? ""),
    queryFn: () => getGroupHistory(gid!),
    enabled: !!gid,
  });
}

export function useGroupSessions(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupSessions(gid ?? ""),
    queryFn: () => getGroupSessions(gid!),
    enabled: !!gid,
  });
}

function useInvalidateAfterWatched(gid: string, participantIds: string[]) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groupHistory(gid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groupSessions(gid) });
    participantIds.forEach((uid) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.history(uid) })
    );
  };
}

export function useMarkWatchedManually(gid: string | null, participantIds: string[]) {
  const invalidate = useInvalidateAfterWatched(gid ?? "", participantIds);
  return useMutation({
    mutationFn: (tid: string) => markWatchedManually(gid, tid, participantIds),
    onSuccess: invalidate,
  });
}
