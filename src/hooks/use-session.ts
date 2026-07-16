import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSession,
  finalizeSession,
  getSession,
  submitRanking,
  submitSelect,
  submitVote,
  type CreateSessionRequest,
  type Session,
  type Tally,
} from "@/lib/api";
import type { ApiError } from "@/lib/api-client";
import { subscribeSessionLive } from "@/lib/session-socket";
import { queryKeys } from "@/lib/query-keys";

export function respondedCount(tally: Session["tally"]): number {
  return tally && "counts" in tally ? Object.values(tally.counts).reduce((a, b) => a + b, 0) : 0;
}

/** Live session query + WS subscription feeding tallies/winner into the same cache entry. */
export function useSession(id: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.session(id ?? ""),
    queryFn: () => getSession(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    return subscribeSessionLive(
      id,
      (msg) => {
        queryClient.setQueryData(queryKeys.session(id), (old?: Session) => {
          if (!old) return old;
          return msg.type === "tally"
            ? { ...old, tally: msg.tally }
            : {
                ...old,
                status: "completed" as const,
                winnerContentId: msg.winnerContentId,
                finalizedAt: msg.finalizedAt,
              };
        });
      },
      // no server-side replay on reconnect — refetch to catch up on anything missed
      () => queryClient.invalidateQueries({ queryKey: queryKeys.session(id) })
    );
  }, [id, queryClient]);

  // ponytail: the draft contract has no "everyone's in" push — any participant's
  // client can call finalize once the tally shows full turnout; duplicate calls
  // just 409. Doesn't apply to priority (no per-participant input) or
  // roundRobin/random (finalized right after the chooser's select).
  useEffect(() => {
    const session = query.data;
    if (!session || session.status !== "voting") return;
    if (session.method === "roundRobin" || session.method === "random" || session.method === "priority") return;
    if (respondedCount(session.tally) >= session.participants.length) {
      finalizeSession(session.id)
        .then((data) => queryClient.setQueryData(queryKeys.session(session.id), data))
        .catch(() => {});
    }
  }, [query.data]);

  return query;
}

export function useCreateSession(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation<Session, ApiError, CreateSessionRequest>({
    mutationFn: (body: CreateSessionRequest) => createSession(groupId, body),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.session(data.id), data),
  });
}

function usePatchTallyMutation<TArgs>(sessionId: string, fn: (args: TArgs) => Promise<Tally>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (tally) => {
      queryClient.setQueryData(queryKeys.session(sessionId), (old?: Session) => (old ? { ...old, tally } : old));
    },
  });
}

export function useSubmitVote(sessionId: string) {
  return usePatchTallyMutation(sessionId, (contentId: string) => submitVote(sessionId, contentId));
}

export function useSubmitRanking(sessionId: string) {
  return usePatchTallyMutation(sessionId, (ranking: string[]) => submitRanking(sessionId, ranking));
}

export function useSubmitSelect(sessionId: string) {
  return usePatchTallyMutation(sessionId, (contentId: string) => submitSelect(sessionId, contentId));
}

export function useFinalizeSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => finalizeSession(sessionId),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.session(sessionId), data),
  });
}
