import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearGroupPick,
  completeGroupPick,
  createGroup,
  getGroup,
  getGroupHistory,
  getGroupSessions,
  getGroupSummaries,
  getMergedWatchlist,
  markWatchedManually,
} from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";

export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups, queryFn: getGroupSummaries });
}

export function useGroup(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(gid ?? ""),
    queryFn: () => getGroup(gid!),
    enabled: !!gid,
  });
}

export function useMergedWatchlist(gid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.merged(gid ?? ""),
    queryFn: () => getMergedWatchlist(gid!),
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

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; memberIds: string[] }) =>
      createGroup(params.name, params.memberIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

function useInvalidateAfterWatched(gid: string, participantIds: string[]) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.group(gid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups });
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

export function useCompleteGroupPick(gid: string, participantIds: string[]) {
  const invalidate = useInvalidateAfterWatched(gid, participantIds);
  return useMutation({
    mutationFn: () => completeGroupPick(gid),
    onSuccess: invalidate,
  });
}

export function useClearGroupPick(gid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearGroupPick(gid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(gid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}
