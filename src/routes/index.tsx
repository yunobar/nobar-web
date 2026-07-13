import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-users";
import { useGroups } from "@/hooks/use-groups";
import { useHistory } from "@/hooks/use-history";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useModal } from "@/lib/modal-context";

export const Route = createFileRoute("/")({ component: HomePage });

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
}

function HomePage() {
  const { data: me } = useCurrentUser();
  const { data: groups = [] } = useGroups();
  const { data: history = [] } = useHistory();
  const { data: watchlist = [] } = useWatchlist();
  const { openCreateGroupModal } = useModal();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-[26px]">
        <h1 className="font-heading text-[34px] font-normal tracking-[-.4px]">
          {greeting()}, {me?.name ?? ""}
        </h1>
        <p className="mt-[5px] text-[15px] text-muted-foreground">What are we watching tonight?</p>
      </div>

      <div className="mb-[38px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <button
          onClick={() => navigate({ to: "/watch" })}
          className="relative col-span-full overflow-hidden rounded-[18px] border border-brand-border bg-brand-soft p-[26px] text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-[radial-gradient(90%_130%_at_90%_10%,var(--accent)_0%,transparent_50%)] opacity-[0.16]" />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-[26px] text-brand-foreground">
              ✦
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="font-heading text-[26px] leading-[1.1]">Watch together</div>
              <div className="mt-1 text-[14px] text-muted-foreground">
                Round up your people and land on something in under a minute.
              </div>
            </div>
            <span className="text-[15px] font-semibold whitespace-nowrap text-brand">Let's go →</span>
          </div>
        </button>
        <Link
          to="/search"
          className="rounded-2xl border border-border bg-surface p-5 text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
        >
          <div className="mb-3 text-[22px]">⌕</div>
          <div className="text-[16px] font-semibold">Find something new</div>
          <div className="mt-[3px] text-[13.5px] text-muted-foreground">
            Search movies & series to add to your list.
          </div>
        </Link>
        <Link
          to="/watchlist"
          className="rounded-2xl border border-border bg-surface p-5 text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
        >
          <div className="mb-3 text-[22px]">☰</div>
          <div className="text-[16px] font-semibold">My watchlist</div>
          <div className="mt-[3px] text-[13.5px] text-muted-foreground">
            {watchlist.length} things you want to watch.
          </div>
        </Link>
      </div>

      <div className="mb-3.5 flex items-center justify-between">
        <Link to="/groups" className="text-[15px] font-semibold hover:text-brand">
          Your people
        </Link>
        <button onClick={openCreateGroupModal} className="text-[13px] font-semibold text-brand">
          + New group
        </button>
      </div>
      <div className="mb-9 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => navigate({ to: "/groups/$groupId", params: { groupId: g.id } })}
            className="cursor-pointer rounded-[15px] border border-border bg-surface p-[18px] shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1 text-[16px] font-semibold">{g.name}</div>
              <span className="shrink-0 text-faint">→</span>
            </div>
            <div className="mt-3 text-[12.5px] text-muted-foreground">
              {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Recently watched</h2>
            <Link to="/history" className="text-[13px] font-semibold text-brand">
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {history.slice(0, 3).map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-[15px] py-[13px] shadow-[var(--shadow)]"
              >
                <div className="size-[9px] rounded-full bg-brand" />
                <div className="flex-1 font-semibold">{h.title}</div>
                <div className="text-[12.5px] text-muted-foreground">
                  Watched {h.date}
                  {h.groupId ? ` · ${groups.find((g) => g.id === h.groupId)?.name ?? ""}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
