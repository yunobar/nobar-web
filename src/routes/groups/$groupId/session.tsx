import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGroup, useMergedWatchlist } from "@/hooks/use-groups";
import { useUsers } from "@/hooks/use-users";
import {
  useCompleteLiveSession,
  useFinalizeRandomPick,
  useLiveSession,
  usePickRoundRobin,
  useSimulateRoundRobin,
  useSubmitRanking,
  useSubmitReady,
  useSubmitVote,
} from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { NobarAvatar } from "@/components/nobar/avatar";
import { METHOD_META, typeLabel } from "@/lib/decision-methods";
import { ME_ID } from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";
import { flash } from "@/lib/toast";
import type { MergedEntry, User } from "@/types/domain";

interface SessionSearch {
  sessionId: string;
}

function validateSearch(search: Record<string, unknown>): SessionSearch {
  return { sessionId: typeof search.sessionId === "string" ? search.sessionId : "" };
}

export const Route = createFileRoute("/groups/$groupId/session")({
  component: SessionPage,
  validateSearch,
});

function titleOf(merged: MergedEntry[], tid: string) {
  return merged.find((m) => m.id === tid);
}

function SessionPage() {
  const { groupId } = Route.useParams();
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate();

  const { data: group } = useGroup(groupId);
  const { data: merged = [] } = useMergedWatchlist(groupId);
  const { data: users = [] } = useUsers();
  const { data: session } = useLiveSession(sessionId);
  const completeLiveSession = useCompleteLiveSession(groupId, session?.participantIds ?? []);
  const queryClient = useQueryClient();
  const revealedNotified = useRef(false);

  useEffect(() => {
    if (session?.status === "revealed" && !revealedNotified.current) {
      revealedNotified.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    }
  }, [session?.status, groupId, queryClient]);

  const exit = () => navigate({ to: "/groups/$groupId", params: { groupId } });

  if (!session || !group) return null;

  const meta = METHOD_META[session.method];
  const userOf = (uid: string) => users.find((u) => u.id === uid) as User;

  return (
    <div>
      <button
        onClick={exit}
        className="mb-3.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        ← {group.name}
      </button>

      {session.status === "collecting" && (
        <>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-[11px] py-1 text-xs font-semibold text-brand">
              {meta.icon} {meta.label}
            </span>
          </div>
          <h1 className="mt-1.5 mb-1.5 font-heading text-[30px] font-normal tracking-[-.3px]">
            {session.name}
          </h1>
          <p className="mb-[22px] text-[14px] text-muted-foreground">
            {
              {
                ranked: "Rank your picks, then lock it in.",
                majority: "Cast your vote — others are locking in too.",
                priority: "Scores combine everyone’s stored priorities.",
                roundrobin: "Only the current member chooses.",
                random: "Spin to let chance decide.",
              }[session.method]
            }
          </p>

          {session.method === "ranked" && (
            <RankedRun sessionId={sessionId} gid={groupId} merged={merged} session={session} users={users} />
          )}
          {session.method === "majority" && (
            <VoteRun
              sessionId={sessionId}
              gid={groupId}
              merged={merged}
              session={session}
              users={users}
              userOf={userOf}
            />
          )}
          {session.method === "priority" && (
            <ReadyRun sessionId={sessionId} gid={groupId} session={session} users={users} />
          )}
          {session.method === "roundrobin" && (
            <RoundRobinRun sessionId={sessionId} gid={groupId} merged={merged} session={session} userOf={userOf} />
          )}
          {session.method === "random" && (
            <RandomRun sessionId={sessionId} gid={groupId} merged={merged} session={session} />
          )}
        </>
      )}

      {session.status === "revealed" && session.result && (
        <ResultView
          merged={merged}
          winnerTid={session.result.winnerTid}
          rounds={session.result.rounds}
          participantIds={session.participantIds}
          userOf={userOf}
          onMarkWatched={() =>
            completeLiveSession.mutate(sessionId, {
              onSuccess: () => {
                flash("Added to everyone’s history");
                navigate({
                  to: "/groups/$groupId",
                  params: { groupId },
                  search: { tab: "history", filter: "all" },
                });
              },
            })
          }
          markWatchedPending={completeLiveSession.isPending}
          onExit={exit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared progress panel (lock-in / reveal suspense)
// ---------------------------------------------------------------------------

function ProgressPanel({
  participantIds,
  progress,
  userOf,
}: {
  participantIds: string[];
  progress: { uid: string; locked: boolean }[];
  userOf: (uid: string) => User;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-[var(--shadow)]">
      <div className="mb-3 text-[13px] font-semibold">Ballots cast</div>
      <div className="flex flex-col gap-[9px]">
        {participantIds.map((uid) => {
          const locked = progress.find((p) => p.uid === uid)?.locked;
          const u = userOf(uid);
          const you = uid === ME_ID;
          return (
            <div key={uid} className="flex items-center gap-2.5">
              <NobarAvatar user={u} size={26} />
              <span className="flex-1 text-[13.5px]">
                {u.name}
                {you ? " (you)" : ""}
              </span>
              <span
                className={
                  "rounded-full px-[9px] py-[3px] text-[11px] font-semibold " +
                  (locked
                    ? "bg-[var(--surface-3)] text-muted-foreground"
                    : "bg-brand-soft text-brand")
                }
              >
                {locked ? "Locked in" : "Deciding…"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranked choice
// ---------------------------------------------------------------------------

function RankedRun({
  sessionId,
  gid,
  merged,
  session,
  users,
}: {
  sessionId: string;
  gid: string;
  merged: MergedEntry[];
  session: NonNullable<ReturnType<typeof useLiveSession>["data"]>;
  users: User[];
}) {
  const submitRanking = useSubmitRanking(sessionId, gid);
  const [ranking, setRanking] = useState<string[] | null>(null);
  const [locked, setLocked] = useState(false);
  const userOf = (uid: string) => users.find((u) => u.id === uid) as User;

  useEffect(() => {
    if (ranking === null && session.myRanking) setRanking(session.myRanking);
  }, [session.myRanking, ranking]);

  const move = (tid: string, dir: -1 | 1) => {
    if (!ranking) return;
    const arr = [...ranking];
    const i = arr.indexOf(tid);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setRanking(arr);
  };

  const myLocked = locked || !!session.progress.find((p) => p.uid === ME_ID)?.locked;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
      <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-[var(--shadow)]">
        <div className="mb-1 text-[13px] font-semibold">Your ranking</div>
        <div className="mb-3.5 text-[12.5px] text-muted-foreground">
          Order these from most to least wanted.
        </div>
        <div className="flex flex-col gap-2">
          {(ranking ?? []).map((tid, i) => {
            const title = titleOf(merged, tid);
            return (
              <div
                key={tid}
                className="animate-nb-fade flex items-center gap-3 rounded-[11px] border border-border bg-secondary px-3 py-[11px]"
              >
                <div className="flex size-6 items-center justify-center rounded-[7px] bg-brand text-[13px] font-bold text-brand-foreground">
                  {i + 1}
                </div>
                <span className="flex-1 font-medium">{title?.title}</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    disabled={myLocked || i === 0}
                    onClick={() => move(tid, -1)}
                    className="flex h-4 w-6 items-center justify-center rounded border border-border bg-surface text-[8px] text-muted-foreground disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    disabled={myLocked || i === (ranking?.length ?? 0) - 1}
                    onClick={() => move(tid, 1)}
                    className="flex h-4 w-6 items-center justify-center rounded border border-border bg-surface text-[8px] text-muted-foreground disabled:opacity-40"
                  >
                    ▼
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <ProgressPanel participantIds={session.participantIds} progress={session.progress} userOf={userOf} />
        <Button
          className="h-11"
          disabled={myLocked || !ranking || submitRanking.isPending}
          onClick={() => {
            if (!ranking) return;
            setLocked(true);
            submitRanking.mutate(ranking);
          }}
        >
          {myLocked ? "Waiting for others…" : "Lock in ranking →"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Majority vote
// ---------------------------------------------------------------------------

function VoteRun({
  sessionId,
  gid,
  merged,
  session,
  userOf,
}: {
  sessionId: string;
  gid: string;
  merged: MergedEntry[];
  session: NonNullable<ReturnType<typeof useLiveSession>["data"]>;
  users: User[];
  userOf: (uid: string) => User;
}) {
  const submitVote = useSubmitVote(sessionId, gid);
  const [myVote, setMyVote] = useState<string | null>(null);
  const myLocked = !!session.progress.find((p) => p.uid === ME_ID)?.locked;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
      <div className="flex max-w-[640px] flex-col gap-2.5">
        {session.candidateIds.map((tid) => {
          const title = titleOf(merged, tid);
          const mine = myVote === tid;
          return (
            <button
              key={tid}
              disabled={myLocked}
              onClick={() => setMyVote(tid)}
              className={
                "flex items-center gap-3 rounded-xl border px-[15px] py-[13px] text-left shadow-[var(--shadow)] disabled:cursor-not-allowed " +
                (mine ? "border-brand-border bg-brand-soft" : "border-border bg-surface")
              }
            >
              <span className="flex-1 font-medium">{title?.title}</span>
              {mine && <span className="text-[13px] font-semibold text-brand">Your pick</span>}
            </button>
          );
        })}
        <Button
          className="mt-2 h-11 max-w-[260px]"
          disabled={!myVote || myLocked || submitVote.isPending}
          onClick={() => myVote && submitVote.mutate(myVote)}
        >
          {myLocked ? "Waiting for others…" : "Lock in vote →"}
        </Button>
      </div>
      <ProgressPanel participantIds={session.participantIds} progress={session.progress} userOf={userOf} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Priority-based (no per-user input — just readiness)
// ---------------------------------------------------------------------------

function ReadyRun({
  sessionId,
  gid,
  session,
  users,
}: {
  sessionId: string;
  gid: string;
  session: NonNullable<ReturnType<typeof useLiveSession>["data"]>;
  users: User[];
}) {
  const submitReady = useSubmitReady(sessionId, gid);
  const userOf = (uid: string) => users.find((u) => u.id === uid) as User;
  const myLocked = !!session.progress.find((p) => p.uid === ME_ID)?.locked;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
      <div className="max-w-[640px] rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
        <div className="mb-2 text-[40px]">★</div>
        <div className="mb-1 text-[16px] font-semibold">Everyone's priorities are in</div>
        <div className="mb-5 text-[13.5px] text-muted-foreground">
          We'll add up how badly everyone wants each title once the whole crew is ready.
        </div>
        <Button
          className="h-11 w-full max-w-[280px]"
          disabled={myLocked || submitReady.isPending}
          onClick={() => submitReady.mutate(undefined)}
        >
          {myLocked ? "Waiting for others…" : "I'm ready — reveal →"}
        </Button>
      </div>
      <ProgressPanel participantIds={session.participantIds} progress={session.progress} userOf={userOf} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round robin (single actor, no lock-in)
// ---------------------------------------------------------------------------

function RoundRobinRun({
  sessionId,
  gid,
  merged,
  session,
  userOf,
}: {
  sessionId: string;
  gid: string;
  merged: MergedEntry[];
  session: NonNullable<ReturnType<typeof useLiveSession>["data"]>;
  userOf: (uid: string) => User;
}) {
  const pickRoundRobin = usePickRoundRobin(sessionId, gid);
  const simulateRoundRobin = useSimulateRoundRobin(sessionId, gid);
  if (!session.roundRobin) return null;
  const chooser = userOf(session.roundRobin.chooserUid);

  return (
    <div className="max-w-[640px]">
      <div className="mb-[18px] flex items-center gap-3.5 rounded-2xl border border-brand-border bg-brand-soft p-[18px]">
        <NobarAvatar user={chooser} size={44} />
        <div className="flex-1">
          <div className="font-semibold">
            {session.roundRobin.isMyTurn ? "It’s your turn to choose" : `It’s ${chooser.name}’s turn to choose`}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            Rotation continues from the last session.
          </div>
        </div>
      </div>
      {session.roundRobin.isMyTurn ? (
        <div className="flex flex-col gap-[9px]">
          {session.candidateIds.map((tid) => {
            const title = titleOf(merged, tid);
            return (
              <button
                key={tid}
                disabled={pickRoundRobin.isPending}
                onClick={() => pickRoundRobin.mutate(tid)}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-[15px] py-[13px] text-left hover:border-brand hover:bg-brand-soft"
              >
                <span className="flex-1 font-medium">{title?.title}</span>
                <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {title ? typeLabel(title.type) : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Button className="h-11" disabled={simulateRoundRobin.isPending} onClick={() => simulateRoundRobin.mutate(undefined)}>
          Let {chooser.name} pick →
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Random picker
// ---------------------------------------------------------------------------

function RandomRun({
  sessionId,
  gid,
  merged,
  session,
}: {
  sessionId: string;
  gid: string;
  merged: MergedEntry[];
  session: NonNullable<ReturnType<typeof useLiveSession>["data"]>;
}) {
  const finalizeRandomPick = useFinalizeRandomPick(sessionId, gid);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    let n = 0;
    const total = 16;
    timer.current = setInterval(() => {
      n++;
      const tid = session.candidateIds[Math.floor(Math.random() * session.candidateIds.length)];
      setDisplay(titleOf(merged, tid)?.title ?? "");
      if (n >= total) {
        if (timer.current) clearInterval(timer.current);
        setSpinning(false);
        finalizeRandomPick.mutate(undefined);
      }
    }, 90);
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <div className="mx-auto max-w-[560px] py-5 text-center">
      <div
        className={
          "rounded-2xl border border-brand-border bg-surface px-6 py-10 shadow-[var(--shadow)] " +
          (spinning ? "animate-nb-spin" : "")
        }
      >
        <div className="mb-2.5 text-xs tracking-[.5px] text-muted-foreground uppercase">
          {spinning ? "Choosing…" : "Tap spin to decide"}
        </div>
        <div className="font-heading text-[34px] leading-[1.1]">{display ?? "—"}</div>
      </div>
      <Button className="mt-[22px] h-[46px] px-7 text-[15px]" disabled={spinning} onClick={spin}>
        {spinning ? "Spinning…" : "🎲 Spin"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

function ResultView({
  merged,
  winnerTid,
  rounds,
  participantIds,
  userOf,
  onMarkWatched,
  markWatchedPending,
  onExit,
}: {
  merged: MergedEntry[];
  winnerTid: string;
  rounds?: { n: number; tally: Record<string, number>; remaining: string[]; eliminated?: string }[];
  participantIds: string[];
  userOf: (uid: string) => User;
  onMarkWatched: () => void;
  markWatchedPending: boolean;
  onExit: () => void;
}) {
  const winner = titleOf(merged, winnerTid);
  const maxVotes = rounds ? Math.max(1, ...rounds.flatMap((r) => Object.values(r.tally))) : 1;

  return (
    <div className="animate-nb-pop mx-auto max-w-[620px] text-center">
      <div className="mb-1.5 text-[13px] tracking-[.5px] text-muted-foreground uppercase">
        Tonight you're watching
      </div>
      <div className="relative overflow-hidden rounded-[18px] border border-brand-border bg-surface px-7 py-[34px] shadow-[var(--shadow)]">
        <div className="relative">
          <div className="mb-2 text-[40px]">🏆</div>
          <div className="font-heading text-[40px] leading-[1.05] tracking-[-.5px]">{winner?.title}</div>
          <div className="mt-2 text-[14px] text-muted-foreground">
            {winner ? `${typeLabel(winner.type)} · ${winner.year}` : ""}
          </div>
          <div className="mt-[18px] flex items-center justify-center gap-1.5">
            {participantIds.map((uid) => (
              <NobarAvatar key={uid} user={userOf(uid)} size={30} />
            ))}
          </div>
        </div>
      </div>

      {rounds && rounds.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-[var(--shadow)]">
          <div className="mb-2.5 text-xs font-semibold tracking-[.4px] text-muted-foreground uppercase">
            How we landed here
          </div>
          <div className="flex flex-col gap-2.5">
            {rounds.map((rd) => (
              <div key={rd.n}>
                <div className="mb-1 text-xs text-faint">
                  Round {rd.n}
                  {rd.eliminated
                    ? ` · dropped ${titleOf(merged, rd.eliminated)?.title}`
                    : rd.n === rounds.length
                      ? " · we have a winner"
                      : ""}
                </div>
                <div className="flex flex-col gap-1">
                  {rd.remaining.map((tid) => (
                    <div key={tid} className="flex items-center gap-2 text-[12.5px]">
                      <span
                        className={
                          "w-[150px] truncate " +
                          (tid === winnerTid ? "font-semibold text-foreground" : "text-muted-foreground")
                        }
                      >
                        {titleOf(merged, tid)?.title}
                      </span>
                      <div className="h-[7px] flex-1 overflow-hidden rounded-md bg-[var(--surface-3)]">
                        <div
                          className="h-full rounded-md"
                          style={{
                            width: `${Math.round((rd.tally[tid] / maxVotes) * 100)}%`,
                            background: tid === winnerTid ? "var(--accent)" : "var(--faint)",
                          }}
                        />
                      </div>
                      <span className="w-[22px] text-right font-semibold">{rd.tally[tid]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
        <Button className="h-11 px-[22px]" disabled={markWatchedPending} onClick={onMarkWatched}>
          🍿 We watched it
        </Button>
        <Button variant="outline" className="h-11 px-5" onClick={onExit}>
          Not tonight
        </Button>
      </div>
      <p className="mt-3.5 text-[12.5px] text-faint">
        We'll add it to what {participantIds.map((uid) => userOf(uid).name).join(", ")} have watched.
      </p>
    </div>
  );
}
