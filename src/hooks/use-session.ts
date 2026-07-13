import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeLiveSession,
  finalizeRandomPick,
  getLiveSession,
  pickRoundRobin,
  simulateRoundRobin,
  startLiveSession,
  submitRanking,
  submitReady,
  submitVote,
} from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";
import type { DecisionMethod, LiveSessionPublic } from "@/types/domain";

export function useStartLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      gid: string;
      name: string;
      method: DecisionMethod;
      participantIds: string[];
      candidateIds: string[];
    }) => startLiveSession(params),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.liveSession(data.id), data);
    },
  });
}

export function useLiveSession(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.liveSession(id ?? ""),
    queryFn: () => getLiveSession(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "collecting" ? 350 : false),
  });
}

function useRevealAwareMutation<TArgs>(
  gid: string,
  fn: (args: TArgs) => Promise<LiveSessionPublic>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.liveSession(data.id), data);
      if (data.status === "revealed") {
        queryClient.invalidateQueries({ queryKey: queryKeys.mockGroup(gid) });
        queryClient.invalidateQueries({ queryKey: queryKeys.mockGroups });
      }
    },
  });
}

export function useSubmitRanking(id: string, gid: string) {
  return useRevealAwareMutation(gid, (ranking: string[]) => submitRanking(id, ranking));
}

export function useSubmitVote(id: string, gid: string) {
  return useRevealAwareMutation(gid, (tid: string) => submitVote(id, tid));
}

export function useSubmitReady(id: string, gid: string) {
  return useRevealAwareMutation(gid, () => submitReady(id));
}

export function usePickRoundRobin(id: string, gid: string) {
  return useRevealAwareMutation(gid, (tid: string) => pickRoundRobin(id, tid));
}

export function useFinalizeRandomPick(id: string, gid: string) {
  return useRevealAwareMutation(gid, () => finalizeRandomPick(id));
}

export function useSimulateRoundRobin(id: string, gid: string) {
  return useRevealAwareMutation(gid, () => simulateRoundRobin(id));
}

export function useCompleteLiveSession(gid: string, participantIds: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeLiveSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mockGroup(gid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mockGroups });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupHistory(gid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupSessions(gid) });
      participantIds.forEach((uid) =>
        queryClient.invalidateQueries({ queryKey: queryKeys.history(uid) })
      );
    },
  });
}
