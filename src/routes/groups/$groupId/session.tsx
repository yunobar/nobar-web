import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGroup } from "@/hooks/use-groups";
import { useCurrentUser } from "@/hooks/use-users";
import {
  respondedCount,
  useFinalizeSession,
  useSession,
  useSubmitRanking,
  useSubmitSelect,
  useSubmitVote,
} from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { NobarAvatar, toAvatarProps } from "@/components/nobar/avatar";
import { METHOD_META, contentTypeLabel } from "@/lib/decision-methods";
import type { Participant, Session } from "@/lib/api";

type Candidate = Session["candidates"][number];

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

function SessionPage() {
  const { groupId } = Route.useParams();
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate();

  const { data: group } = useGroup(groupId);
  const { data: me } = useCurrentUser();
  const { data: session } = useSession(sessionId);

  const exit = () => navigate({ to: "/groups/$groupId", params: { groupId } });

  if (!session || !group || !me) return null;

  const meta = METHOD_META[session.method];
  const participantOf = (id: string) => session.participants.find((p) => p.id === id);

  return (
    <div>
      <button
        onClick={exit}
        className="mb-3.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        ← {group.name}
      </button>

      {session.status === "voting" && (
        <>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-[11px] py-1 text-xs font-semibold text-brand">
              {meta.icon} {meta.label}
            </span>
          </div>
          <h1 className="mt-1.5 mb-1.5 font-heading text-[30px] font-normal tracking-[-.3px]">
            Movie night
          </h1>
          <p className="mb-[22px] text-[14px] text-muted-foreground">
            {
              {
                ranked: "Rank your picks — you can reorder any time before it's decided.",
                majority: "Cast your vote — you can change it any time before it's decided.",
                priority: "Scores combine everyone’s stored priorities.",
                roundRobin: "Only the current member chooses.",
                random: "Spin to let chance decide.",
              }[session.method]
            }
          </p>

          {session.method === "ranked" && <RankedRun sessionId={sessionId} session={session} />}
          {session.method === "majority" && <VoteRun sessionId={sessionId} session={session} />}
          {session.method === "priority" && <PriorityRun sessionId={sessionId} />}
          {session.method === "roundRobin" && (
            <RoundRobinRun sessionId={sessionId} session={session} meId={me.id} participantOf={participantOf} />
          )}
          {session.method === "random" && <RandomRun sessionId={sessionId} session={session} />}
        </>
      )}

      {session.status === "completed" && session.winnerContentId && (
        <ResultView
          candidates={session.candidates}
          winnerContentId={session.winnerContentId}
          participants={session.participants}
          onExit={exit}
        />
      )}

      {session.status === "cancelled" && (
        <div className="py-14 text-center text-muted-foreground">
          This session was cancelled.
          <div className="mt-3">
            <Button variant="outline" onClick={exit}>
              Back to {group.name}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared "how many have responded" summary
// ---------------------------------------------------------------------------

function BallotsSummary({ session }: { session: Session }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-[var(--shadow)]">
      <div className="mb-1 text-[13px] font-semibold">Ballots cast</div>
      <div className="text-[13.5px] text-muted-foreground">
        {respondedCount(session.tally)} of {session.participants.length} locked in
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranked choice
// ---------------------------------------------------------------------------

function RankedRun({ sessionId, session }: { sessionId: string; session: Session }) {
  const submitRanking = useSubmitRanking(sessionId);
  const [ranking, setRanking] = useState<string[]>(() => session.candidates.map((c) => c.id));

  const move = (id: string, dir: -1 | 1) => {
    const arr = [...ranking];
    const i = arr.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setRanking(arr);
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
      <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-[var(--shadow)]">
        <div className="mb-1 text-[13px] font-semibold">Your ranking</div>
        <div className="mb-3.5 text-[12.5px] text-muted-foreground">
          Order these from most to least wanted.
        </div>
        <div className="flex flex-col gap-2">
          {ranking.map((id, i) => {
            const c = session.candidates.find((x) => x.id === id);
            return (
              <div
                key={id}
                className="animate-nb-fade flex items-center gap-3 rounded-[11px] border border-border bg-secondary px-3 py-[11px]"
              >
                <div className="flex size-6 items-center justify-center rounded-[7px] bg-brand text-[13px] font-bold text-brand-foreground">
                  {i + 1}
                </div>
                <span className="flex-1 font-medium">{c?.title}</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    disabled={i === 0}
                    onClick={() => move(id, -1)}
                    className="flex h-4 w-6 items-center justify-center rounded border border-border bg-surface text-[8px] text-muted-foreground disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    disabled={i === ranking.length - 1}
                    onClick={() => move(id, 1)}
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
        <BallotsSummary session={session} />
        <Button
          className="h-11"
          disabled={submitRanking.isPending}
          onClick={() => submitRanking.mutate(ranking)}
        >
          {submitRanking.isSuccess ? "Update ranking →" : "Lock in ranking →"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Majority vote
// ---------------------------------------------------------------------------

function VoteRun({ sessionId, session }: { sessionId: string; session: Session }) {
  const submitVote = useSubmitVote(sessionId);
  const [myVote, setMyVote] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
      <div className="flex max-w-[640px] flex-col gap-2.5">
        {session.candidates.map((c) => {
          const mine = myVote === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setMyVote(c.id);
                submitVote.mutate(c.id);
              }}
              className={
                "flex items-center gap-3 rounded-xl border px-[15px] py-[13px] text-left shadow-[var(--shadow)] " +
                (mine ? "border-brand-border bg-brand-soft" : "border-border bg-surface")
              }
            >
              <span className="flex-1 font-medium">{c.title}</span>
              {mine && <span className="text-[13px] font-semibold text-brand">Your pick</span>}
            </button>
          );
        })}
      </div>
      <BallotsSummary session={session} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Priority-based (no per-participant input — snapshots decide everything)
// ---------------------------------------------------------------------------

function PriorityRun({ sessionId }: { sessionId: string }) {
  const finalizeSession = useFinalizeSession(sessionId);

  return (
    <div className="max-w-[640px] rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
      <div className="mb-2 text-[40px]">★</div>
      <div className="mb-1 text-[16px] font-semibold">Everyone's priorities are in</div>
      <div className="mb-5 text-[13.5px] text-muted-foreground">
        We'll add up how badly everyone wants each title, based on what's already in your watchlists.
      </div>
      <Button
        className="h-11 w-full max-w-[280px]"
        disabled={finalizeSession.isPending}
        onClick={() => finalizeSession.mutate()}
      >
        Reveal →
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round robin (current chooser only)
// ---------------------------------------------------------------------------

function RoundRobinRun({
  sessionId,
  session,
  meId,
  participantOf,
}: {
  sessionId: string;
  session: Session;
  meId: string;
  participantOf: (id: string) => Participant | undefined;
}) {
  const submitSelect = useSubmitSelect(sessionId);
  const finalizeSession = useFinalizeSession(sessionId);
  const isMyTurn = session.currentChooserProfileId === meId;
  const chooser = session.currentChooserProfileId ? participantOf(session.currentChooserProfileId) : undefined;

  const pick = (contentId: string) => {
    submitSelect.mutate(contentId, { onSuccess: () => finalizeSession.mutate() });
  };

  return (
    <div className="max-w-[640px]">
      <div className="mb-[18px] flex items-center gap-3.5 rounded-2xl border border-brand-border bg-brand-soft p-[18px]">
        {chooser && <NobarAvatar user={toAvatarProps(chooser)} size={44} />}
        <div className="flex-1">
          <div className="font-semibold">
            {isMyTurn ? "It’s your turn to choose" : `It’s ${chooser?.name ?? "someone"}’s turn to choose`}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            Rotation continues from the last session.
          </div>
        </div>
      </div>
      {isMyTurn ? (
        <div className="flex flex-col gap-[9px]">
          {session.candidates.map((c) => (
            <button
              key={c.id}
              disabled={submitSelect.isPending}
              onClick={() => pick(c.id)}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-[15px] py-[13px] text-left hover:border-brand hover:bg-brand-soft"
            >
              <span className="flex-1 font-medium">{c.title}</span>
              <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold text-muted-foreground">
                {contentTypeLabel(c.contentType)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-[18px] text-center text-[13.5px] text-muted-foreground">
          Waiting for {chooser?.name ?? "them"} to choose…
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Random picker — no chooser concept server-side (currentChooserProfileId is
// always null for this method); any participant can spin. `/select` is
// round-robin-only on this backend (400s for random) — the resolver ignores
// participant input anyway, so this goes straight to `/finalize`.
// ---------------------------------------------------------------------------

function RandomRun({ sessionId, session }: { sessionId: string; session: Session }) {
  const finalizeSession = useFinalizeSession(sessionId);
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
      const c = session.candidates[Math.floor(Math.random() * session.candidates.length)];
      setDisplay(c?.title ?? "");
      if (n >= total) {
        if (timer.current) clearInterval(timer.current);
        setSpinning(false);
        finalizeSession.mutate();
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
  candidates,
  winnerContentId,
  participants,
  onExit,
}: {
  candidates: Candidate[];
  winnerContentId: string;
  participants: Participant[];
  onExit: () => void;
}) {
  const winner = candidates.find((c) => c.id === winnerContentId);

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
            {winner
              ? `${contentTypeLabel(winner.contentType)}${winner.releaseYear ? ` · ${winner.releaseYear}` : ""}`
              : ""}
          </div>
          <div className="mt-[18px] flex items-center justify-center gap-1.5">
            {participants.map((p) => (
              <NobarAvatar key={p.id} user={toAvatarProps(p)} size={30} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
        <Button className="h-11 px-[22px]" onClick={onExit}>
          Done →
        </Button>
      </div>
    </div>
  );
}
