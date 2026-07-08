import { createFileRoute } from "@tanstack/react-router";
import { useWatchlist, useRemoveWatchlistItem, useUpdateWatchlistPriority } from "@/hooks/use-watchlist";
import { useModal } from "@/lib/modal-context";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { typeLabel } from "@/lib/decision-methods";
import type { Priority } from "@/types/domain";

export const Route = createFileRoute("/watchlist")({ component: WatchlistPage });

function WatchlistPage() {
  const { data: items = [] } = useWatchlist();
  const { openAddModal } = useModal();
  const removeItem = useRemoveWatchlistItem();
  const updatePriority = useUpdateWatchlistPriority();

  const movieCount = items.filter((i) => i.type === "movie").length;
  const summary = `${items.length} titles · ${movieCount} movies · ${items.length - movieCount} series`;

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[32px] font-normal tracking-[-.3px]">My watchlist</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{summary}</p>
        </div>
        <Button onClick={openAddModal} className="h-10 gap-1.5 px-4">
          <span className="text-[17px] leading-none">+</span> Add title
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
        {items.map((it) => (
          <div
            key={it.id}
            className="animate-nb-fade flex flex-col gap-2.5 rounded-[13px] border border-border bg-surface p-4 shadow-[var(--shadow)]"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] leading-snug font-semibold">{it.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold">
                    {typeLabel(it.type)}
                  </span>
                  <span>·</span>
                  <span>{it.year}</span>
                </div>
              </div>
              <button
                title="Remove"
                onClick={() => removeItem.mutate(it.id)}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-[15px] text-faint hover:bg-secondary hover:text-foreground"
              >
                ×
              </button>
            </div>
            {it.notes && (
              <div className="rounded-lg bg-secondary px-2.5 py-2 text-[13px] leading-snug text-muted-foreground">
                {it.notes}
              </div>
            )}
            <div className="mt-0.5 flex items-center justify-between gap-2.5">
              <NativeSelect
                value={it.priority}
                onChange={(e) =>
                  updatePriority.mutate({ tid: it.id, priority: e.target.value as Priority })
                }
                size="sm"
                className={
                  it.priority === "must"
                    ? "[&_select]:border-brand-border [&_select]:bg-brand-soft [&_select]:text-brand [&_select]:font-semibold"
                    : "[&_select]:font-semibold"
                }
              >
                <NativeSelectOption value="must">Must Watch</NativeSelectOption>
                <NativeSelectOption value="high">High</NativeSelectOption>
                <NativeSelectOption value="medium">Medium</NativeSelectOption>
                <NativeSelectOption value="low">Low</NativeSelectOption>
              </NativeSelect>
              <span className="text-xs text-faint">Added {it.dateAdded}</span>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          Your watchlist is empty. Add your first title.
        </div>
      )}
    </div>
  );
}
