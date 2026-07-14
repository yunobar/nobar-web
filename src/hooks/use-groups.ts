import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupHistory, getGroupSessions } from "@/lib/mock-api";
import {
  createGroup,
  getGroup,
  getGroups,
  getMergedWatchlist,
  joinGroup,
  type MergedFilter,
} from "@/lib/api";
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

export function useMergedWatchlist(
  gid: string | undefined,
  filter: MergedFilter = "all",
) {
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => joinGroup(token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

// --- Mock-backed: group history/sessions (Layer-3 Watch Ledger, not built yet) --

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
