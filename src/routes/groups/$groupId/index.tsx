import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  useClearGroupPick,
  useCompleteGroupPick,
  useGroup,
  useGroupHistory,
  useGroupSessions,
  useMergedWatchlist,
} from "@/hooks/use-groups";
import { useUsers } from "@/hooks/use-users";
import { useModal } from "@/lib/modal-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarStack, NobarAvatar } from "@/components/nobar/avatar";
import { METHOD_META, PRIORITY_META, typeLabel } from "@/lib/decision-methods";
import { flash } from "@/lib/toast";
import type { ContentType, User } from "@/types/domain";

const groupDetailSearchSchema = z.object({
  tab: z.enum(["merged", "sessions", "history"]).default("merged"),
  filter: z.enum(["all", "movie", "tv"]).default("all"),
});

export const Route = createFileRoute("/groups/$groupId/")({
  component: GroupDetailPage,
  validateSearch: groupDetailSearchSchema,
});

function memberName(users: User[], uid: string) {
  return users.find((u) => u.id === uid)?.name ?? uid;
}

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const { tab, filter } = Route.useSearch();
  const navigate = useNavigate();

  const { data: group } = useGroup(groupId);
  const { data: users = [] } = useUsers();
  const { data: merged = [] } = useMergedWatchlist(groupId);
  const { data: sessions = [] } = useGroupSessions(groupId);
  const { data: groupHistory = [] } = useGroupHistory(groupId);
  const { openManualWatchModal } = useModal();
  const completePick = useCompleteGroupPick(groupId, group?.memberIds ?? []);
  const clearPick = useClearGroupPick(groupId);

  if (!group) return null;

  const members = group.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
  const winner = group.currentPick
    ? merged.find((m) => m.id === group.currentPick!.tid)
    : undefined;
  const filteredMerged = merged.filter((m) => filter === "all" || m.type === filter);

  return (
    <div>
      <Link to="/groups" className="mb-3.5 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        ← Groups
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[32px] font-normal tracking-[-.3px]">{group.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <AvatarStack users={members} size={28} />
            <span className="ml-1.5 text-[13px] text-muted-foreground">
              {members.map((u) => u.name).join(", ")}
            </span>
          </div>
        </div>
        <Button
          className="h-10 gap-1.5 bg-brand px-4 text-brand-foreground hover:bg-brand/90"
          onClick={() => navigate({ to: "/watch", search: { groupId, step: 2 } })}
        >
          ✦ Watch together
        </Button>
      </div>

      {group.currentPick && winner ? (
        <div className="relative mb-[26px] overflow-hidden rounded-[18px] border border-brand-border bg-surface p-6 shadow-[var(--shadow)]">
          <div className="absolute inset-0 bg-[radial-gradient(80%_130%_at_90%_0%,var(--accent)_0%,transparent_50%)] opacity-[0.14]" />
          <div className="relative flex flex-wrap items-center gap-[22px]">
            <div className="min-w-[200px] flex-1">
              <div className="mb-1.5 text-xs font-semibold tracking-[.5px] text-brand uppercase">
                Up next together
              </div>
              <div className="font-heading text-[34px] leading-[1.05] tracking-[-.4px]">{winner.title}</div>
              <div className="mt-1.5 text-[14px] text-muted-foreground">
                {typeLabel(winner.type)} · {winner.year}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button
                className="h-[46px] gap-1.5 bg-brand px-[22px] text-[15px] text-brand-foreground hover:bg-brand/90"
                disabled={completePick.isPending}
                onClick={() =>
                  completePick.mutate(undefined, {
                    onSuccess: () => flash("Added to what you’ve watched together"),
                  })
                }
              >
                🍿 We watched it
              </Button>
              <Button
                variant="outline"
                className="h-[46px] px-[18px] text-[14px]"
                disabled={clearPick.isPending}
                onClick={() =>
                  clearPick.mutate(undefined, {
                    onSuccess: () => navigate({ to: "/watch", search: { groupId, step: 2 } }),
                  })
                }
              >
                Pick again
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate({ to: "/watch", search: { groupId, step: 2 } })}
          className="relative mb-[26px] w-full overflow-hidden rounded-[18px] border border-brand-border bg-brand-soft p-6 text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-[radial-gradient(80%_130%_at_90%_0%,var(--accent)_0%,transparent_50%)] opacity-[0.14]" />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-brand text-2xl text-brand-foreground">
              ✦
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="font-heading text-2xl leading-[1.1]">Let's watch!</div>
              <div className="mt-[3px] text-[14px] text-muted-foreground">
                Pick something for the whole crew in under a minute.
              </div>
            </div>
            <span className="font-semibold whitespace-nowrap text-brand">Start →</span>
          </div>
        </button>
      )}

      <Tabs value={tab} className="mb-[22px] gap-0 border-b border-border">
        <TabsList variant="line" className="h-auto gap-0 rounded-none bg-transparent p-0">
          {(
            [
              ["merged", "What you all want"],
              ["sessions", "Movie nights"],
              ["history", "Watched together"],
            ] as const
          ).map(([key, label]) => (
            <TabsTrigger
              key={key}
              value={key}
              onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, tab: key }) })}
              className="rounded-none border-0 px-3.5 py-2.5 text-[14px] font-medium text-muted-foreground data-active:bg-transparent data-active:text-foreground data-active:shadow-none data-active:font-semibold"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "merged" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-[10px] border border-border bg-secondary p-[3px]">
              {(["all", "movie", "tv"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, filter: f }) })}
                  className={
                    "h-[30px] rounded-lg px-3.5 text-[13px] font-medium " +
                    (filter === f ? "bg-surface font-semibold text-foreground shadow-[var(--shadow)]" : "text-muted-foreground")
                  }
                >
                  {f === "all" ? "All" : f === "movie" ? "Movies" : "Series"}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-muted-foreground">
              {filteredMerged.length} things you all want to watch
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {filteredMerged.map((m) => (
              <div
                key={m.id}
                className="animate-nb-fade flex flex-wrap items-center gap-4 rounded-[13px] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow)]"
              >
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px] font-semibold">{m.title}</span>
                    <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {typeLabel(m.type as ContentType)}
                    </span>
                  </div>
                  <div className="mt-[3px] text-[12.5px] text-muted-foreground">
                    Added by {m.entries.map((e) => memberName(users, e.uid)).join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-[5px]">
                  {m.entries.map((e) => {
                    const u = users.find((x) => x.id === e.uid);
                    if (!u) return null;
                    return (
                      <div key={e.uid} title={`${u.name} · ${PRIORITY_META[e.priority].label}`}>
                        <NobarAvatar user={u} size={26} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <div className="min-w-16 text-right">
                    <div className="text-[15px] font-semibold">{m.entries.length}</div>
                    <div className="text-[11px] text-faint">interested</div>
                  </div>
                  <Button
                    variant="outline"
                    className="h-[34px] px-3.5 text-[13px]"
                    onClick={() =>
                      openManualWatchModal({
                        gid: groupId,
                        tid: m.id,
                        title: m.title,
                        memberIds: group.memberIds,
                      })
                    }
                  >
                    ✓ Mark watched
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <div>
          {sessions.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3.5 rounded-[13px] border border-border bg-surface px-4 py-[15px] shadow-[var(--shadow)]"
                >
                  <div className="min-w-[160px] flex-1">
                    <div className="font-semibold">{s.name}</div>
                    <div className="mt-[3px] text-[12.5px] text-muted-foreground">
                      {METHOD_META[s.method].label} · {s.date}
                    </div>
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    You watched <b className="text-foreground">{s.winnerTitle}</b>
                  </div>
                  <span className="rounded-full bg-[var(--surface-3)] px-[9px] py-[3px] text-[11px] font-semibold text-muted-foreground">
                    Decided
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center text-muted-foreground">
              No sessions yet. Start one to decide tonight's pick.
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div>
          {groupHistory.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {groupHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-3.5 rounded-[13px] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow)]"
                >
                  <div className="min-w-[160px] flex-1">
                    <div className="font-semibold">{h.title}</div>
                    <div className="mt-[3px] text-[12.5px] text-muted-foreground">
                      {h.date} · {h.via === "session" ? "Movie night" : "Logged"}
                    </div>
                  </div>
                  <div className="flex items-center gap-[5px]">
                    {h.participantIds.map((uid) => {
                      const u = users.find((x) => x.id === uid);
                      return u ? <NobarAvatar key={uid} user={u} size={24} /> : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center text-muted-foreground">Nothing watched together yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
