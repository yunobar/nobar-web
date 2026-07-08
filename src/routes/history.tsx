import { createFileRoute } from "@tanstack/react-router";
import { useHistory } from "@/hooks/use-history";
import { useGroups } from "@/hooks/use-groups";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const { data: items = [] } = useHistory();
  const { data: groups = [] } = useGroups();
  const groupName = (gid: string | null) => (gid ? groups.find((g) => g.id === gid)?.name : undefined);

  return (
    <div>
      <h1 className="mb-1 font-heading text-[32px] font-normal tracking-[-.3px]">Watch history</h1>
      <p className="mb-[22px] text-[14px] text-muted-foreground">{items.length} things watched</p>
      <div className="flex flex-col gap-2.5">
        {items.map((h, i) => (
          <div
            key={i}
            className="animate-nb-fade flex flex-wrap items-center gap-3.5 rounded-[13px] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow)]"
          >
            <div className="size-[9px] shrink-0 rounded-full bg-brand" />
            <div className="min-w-[160px] flex-1">
              <div className="font-semibold">{h.title}</div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                Watched {h.date}
                {h.groupId ? ` · ${groupName(h.groupId)}` : ""}
              </div>
            </div>
            <span
              className={
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
                (h.via === "session" ? "bg-brand-soft text-brand" : "bg-[var(--surface-3)] text-muted-foreground")
              }
            >
              {h.via === "session" ? "Movie night" : "Logged"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
