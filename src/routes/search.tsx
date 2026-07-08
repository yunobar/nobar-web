import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchTitles } from "@/hooks/use-search";
import { useAddWatchlistItem } from "@/hooks/use-watchlist";
import { contentTypeLabel } from "@/lib/decision-methods";
import { flash } from "@/lib/toast";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: results = [] } = useSearchTitles(query);
  const addItem = useAddWatchlistItem();
  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <h1 className="mb-1 font-heading text-[32px] font-normal tracking-[-.3px]">
        Find something to watch
      </h1>
      <p className="mb-5 text-[14px] text-muted-foreground">
        Search movies and series, then add them to your list.
      </p>
      <div className="relative mb-5 max-w-[560px]">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[17px] text-faint">
          ⌕
        </span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles…"
          className="h-12 w-full rounded-xl pl-10 text-[15px] shadow-[var(--shadow)]"
        />
      </div>

      {hasQuery ? (
        <div className="grid max-w-[900px] grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">
          {results.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-[15px] py-[13px] shadow-[var(--shadow)]"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{r.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold">
                    {contentTypeLabel(r.contentType)}
                  </span>
                  <span>{r.releaseYear ?? ""}</span>
                </div>
              </div>
              <Button
                className="shrink-0"
                disabled={addItem.isPending}
                onClick={() =>
                  addItem.mutate(
                    // ponytail: mock-boundary shim — real Content → mock watchlist entry; drops when watchlist becomes a real endpoint
                    {
                      entry: {
                        title: r.title,
                        type: r.contentType === "tv" ? "series" : "movie",
                        year: r.releaseYear ?? 0,
                      },
                      priority: "high",
                      notes: "",
                    },
                    { onSuccess: () => flash(`Added ${r.title} to your watchlist`) }
                  )
                }
              >
                + Add
              </Button>
            </div>
          ))}
          {results.length === 0 && (
            <div className="col-span-full py-10 text-muted-foreground">No matches. Try another title.</div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-[14px] text-faint">
          Start typing to find something to watch.
        </div>
      )}
    </div>
  );
}
