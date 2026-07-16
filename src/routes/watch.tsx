import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useGroup, useGroups, useMergedWatchlist } from "@/hooks/use-groups";
import { useCreateSession } from "@/hooks/use-session";
import { useModal } from "@/lib/modal-context";
import { flash } from "@/lib/toast";
import { NobarAvatar, toAvatarProps } from "@/components/nobar/avatar";
import { Button } from "@/components/ui/button";
import { METHOD_META, contentTypeLabel } from "@/lib/decision-methods";
import type { DecisionMethod } from "@/types/domain";

const watchSearchSchema = z.object({
  groupId: z.string().optional(),
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  method: z.enum(["ranked", "majority", "priority", "roundRobin", "random"]).default("ranked"),
});

export const Route = createFileRoute("/watch")({
  component: WatchPage,
  validateSearch: watchSearchSchema,
});

const METHOD_ORDER: DecisionMethod[] = ["ranked", "majority", "priority", "roundRobin", "random"];

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function WatchPage() {
  const { groupId, step, method } = Route.useSearch();
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();
  const { data: group, refetch: refetchGroup } = useGroup(groupId);
  const { data: merged = [] } = useMergedWatchlist(groupId);
  const { openCreateGroupModal } = useModal();
  const createSession = useCreateSession(groupId ?? "");

  const [excludedParticipants, setExcludedParticipants] = useState<Set<string>>(new Set());
  const [excludedCandidates, setExcludedCandidates] = useState<Set<string>>(new Set());

  // Member/content ids can repeat across groups (the same person or title can
  // appear in more than one) — an exclusion from a previously selected group
  // must not silently carry over when the user picks a different one.
  useEffect(() => {
    setExcludedParticipants(new Set());
    setExcludedCandidates(new Set());
  }, [groupId]);

  const members = group?.members ?? [];
  const participantIds = members.map((m) => m.id).filter((id) => !excludedParticipants.has(id));
  const candidateIds = merged.map((m) => m.content.id).filter((id) => !excludedCandidates.has(id));

  const goBack = () => {
    if (step <= 1) navigate({ to: "/" });
    else navigate({ to: ".", search: (prev) => ({ ...prev, step: (step - 1) as 1 | 2 | 3 }) });
  };

  const launch = () => {
    if (!groupId || participantIds.length === 0 || candidateIds.length === 0) return;
    createSession.mutate(
      { method, participantIds, candidateContentIds: candidateIds },
      {
        onSuccess: (session) =>
          navigate({
            to: "/groups/$groupId/session/$sessionId",
            params: { groupId, sessionId: session.id },
          }),
        onError: async (error) => {
          // ponytail: 409 = someone else created a session while this page's
          // activeSession was stale (ADR-0006) — re-fetch and follow it in,
          // rather than surfacing the race as a raw error.
          if (error.statusCode === 409) {
            const { data: freshGroup } = await refetchGroup();
            if (freshGroup?.activeSession) {
              navigate({
                to: "/groups/$groupId/session/$sessionId",
                params: { groupId, sessionId: freshGroup.activeSession.id },
              });
              return;
            }
          }
          flash("Couldn't start the session. Try again.");
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-[600px]">
      <div className="mb-[34px] flex items-center gap-4">
        <button
          onClick={goBack}
          className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[15px] hover:bg-secondary"
        >
          ←
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-2 rounded-full transition-all"
              style={{ width: step === n ? 28 : 8, background: step >= n ? "var(--accent)" : "var(--border)" }}
            />
          ))}
        </div>
        <div className="w-[34px] shrink-0" />
      </div>

      {step === 1 && (
        <>
          <h1 className="mb-1.5 text-center font-heading text-[30px] font-normal tracking-[-.3px]">
            Who are we watching with?
          </h1>
          <p className="mb-6 text-center text-[14px] text-muted-foreground">Pick your crew for tonight.</p>
          <div className="flex flex-col gap-[11px]">
            {groups.map((g) => {
              const on = groupId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, groupId: g.id }) })}
                  className={
                    "w-full rounded-2xl border p-4 text-left shadow-[var(--shadow)] " +
                    (on ? "border-brand-border bg-brand-soft" : "border-border bg-surface")
                  }
                >
                  <div className="flex items-center gap-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-semibold">{g.name}</div>
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div
                      className={
                        "flex size-[22px] items-center justify-center rounded-full border text-xs font-bold " +
                        (on ? "border-brand bg-brand text-brand-foreground" : "border-border text-transparent")
                      }
                    >
                      ✓
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={openCreateGroupModal}
              className="w-full rounded-2xl border border-dashed border-border p-3.5 text-center text-[14px] font-medium text-muted-foreground hover:border-brand hover:text-foreground"
            >
              + Start a new group
            </button>
          </div>
          <Button
            className="mt-6 h-12 w-full text-[15px]"
            disabled={!group}
            onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, step: 2 }) })}
          >
            Continue →
          </Button>
          <p className="mt-2.5 text-center text-[12.5px] text-faint">
            {!group ? "Pick who you’re watching with" : `${members.length} of you tonight`}
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="mb-1.5 text-center font-heading text-[30px] font-normal tracking-[-.3px]">
            How should we pick?
          </h1>
          <p className="mb-6 text-center text-[14px] text-muted-foreground">
            Choose a way to settle on tonight's title.
          </p>
          <div className="flex flex-col gap-[11px]">
            {METHOD_ORDER.map((key) => {
              const meta = METHOD_META[key];
              const on = method === key;
              return (
                <button
                  key={key}
                  onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, method: key }) })}
                  className={
                    "flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left shadow-[var(--shadow)] " +
                    (on ? "border-brand-border bg-brand-soft" : "border-border bg-surface")
                  }
                >
                  <div
                    className={
                      "flex size-11 shrink-0 items-center justify-center rounded-xl text-xl " +
                      (on ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground")
                    }
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15.5px] font-semibold">{meta.label}</div>
                    <div className="mt-[3px] text-[12.5px] leading-snug text-muted-foreground">{meta.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <Button
            className="mt-6 h-12 w-full text-[15px]"
            onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, step: 3 }) })}
          >
            Continue →
          </Button>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="mb-1.5 text-center font-heading text-[30px] font-normal tracking-[-.3px]">
            Ready when you are
          </h1>
          <p className="mb-6 text-center text-[14px] text-muted-foreground">Here's the plan for tonight.</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
            <div className="border-b border-border p-[18px]">
              <div className="mb-2.5 text-xs tracking-[.4px] text-faint uppercase">Watching with</div>
              <div className="flex flex-col gap-2">
                {members.map((m) => {
                  const on = !excludedParticipants.has(m.id);
                  return (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setExcludedParticipants((prev) => toggle(prev, m.id))}
                        className="size-4 accent-[var(--accent)]"
                      />
                      <NobarAvatar user={toAvatarProps(m)} size={26} />
                      <span className="text-[14px] font-medium">{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-border p-[18px]">
              <span className="text-[22px]">{METHOD_META[method].icon}</span>
              <div>
                <div className="text-[15px] font-semibold">{METHOD_META[method].label}</div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">{METHOD_META[method].desc}</div>
              </div>
            </div>
            <div className="p-[18px]">
              <div className="mb-2.5 text-xs tracking-[.4px] text-faint uppercase">Choosing from</div>
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {merged.map((m) => {
                  const on = !excludedCandidates.has(m.content.id);
                  return (
                    <label key={m.content.id} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setExcludedCandidates((prev) => toggle(prev, m.content.id))}
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className="flex-1 text-[14px] font-medium">{m.content.title}</span>
                      <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {contentTypeLabel(m.content.contentType)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <Button
            className="mt-6 h-[52px] w-full bg-brand text-[16px] text-brand-foreground hover:bg-brand/90"
            disabled={createSession.isPending || participantIds.length === 0 || candidateIds.length === 0}
            onClick={launch}
          >
            Let's pick something →
          </Button>
        </>
      )}
    </div>
  );
}
