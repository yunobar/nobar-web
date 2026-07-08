import { useState } from "react";
import { useModal } from "@/lib/modal-context";
import { useUsers } from "@/hooks/use-users";
import { useAddWatchlistItem } from "@/hooks/use-watchlist";
import { useCreateGroup, useMarkWatchedManually } from "@/hooks/use-groups";
import { useSearchTitles } from "@/hooks/use-search";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { NobarAvatar } from "@/components/nobar/avatar";
import { ToggleRow, ToggleCheck } from "@/components/nobar/toggle-row";
import { contentTypeLabel } from "@/lib/decision-methods";
import { flash } from "@/lib/toast";
import { ME_ID } from "@/lib/mock-api";
import type { Content } from "@/lib/api";
import type { Priority } from "@/types/domain";

export function ModalHost() {
  const { modal, closeModal } = useModal();

  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[440px] rounded-2xl p-[22px]">
        {modal?.type === "add" && <AddTitleModal />}
        {modal?.type === "createGroup" && <CreateGroupModal />}
        {modal?.type === "manualWatch" && <ManualWatchModal payload={modal} />}
      </DialogContent>
    </Dialog>
  );
}

function AddTitleModal() {
  const { closeModal } = useModal();
  const [step, setStep] = useState<"search" | "details">("search");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Content | null>(null);
  const [priority, setPriority] = useState<Priority>("high");
  const [notes, setNotes] = useState("");
  const { data: results = [] } = useSearchTitles(query);
  const addItem = useAddWatchlistItem();

  const hasQuery = query.trim().length > 0;

  if (step === "search") {
    return (
      <>
        <div className="mb-1 font-heading text-[23px]">Add to watchlist</div>
        <div className="mb-3.5 text-[13px] text-muted-foreground">
          Search for a movie or series to add.
        </div>
        <div className="relative mb-3.5">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-faint">
            ⌕
          </span>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles…"
            className="h-[42px] w-full pl-[34px]"
          />
        </div>
        {hasQuery ? (
          <div className="nb-scroll flex max-h-[320px] flex-col gap-[7px] overflow-auto">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelected(r);
                  setPriority("high");
                  setNotes("");
                  setStep("details");
                }}
                className="flex w-full items-center gap-[11px] rounded-[10px] border border-border bg-secondary px-3 py-[11px] text-left disabled:opacity-55 hover:not-disabled:border-brand"
              >
                <span className="flex-1 font-medium">{r.title}</span>
                <span className="rounded-md bg-[var(--surface-3)] px-[7px] py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {contentTypeLabel(r.contentType)}
                </span>
                <span className="min-w-[34px] text-right text-[12.5px] text-faint">
                  {r.releaseYear ?? ""}
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <div className="p-7 text-center text-[13px] text-muted-foreground">
                No matches. Try another title.
              </div>
            )}
          </div>
        ) : (
          <div className="p-7 text-center text-[13px] text-faint">
            Start typing to find something to watch.
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("search")}
        className="mb-3 text-[13px] text-muted-foreground hover:text-foreground"
      >
        ← Search
      </button>
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-soft p-[13px]">
        <div className="flex-1">
          <div className="text-[16px] font-semibold">{selected?.title}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {selected ? `${contentTypeLabel(selected.contentType)} · ${selected.releaseYear ?? ""}` : ""}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <Label className="flex flex-col items-start gap-1.5 text-[13px] font-medium">
          Priority
          <NativeSelect
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full"
          >
            <NativeSelectOption value="must">Must Watch</NativeSelectOption>
            <NativeSelectOption value="high">High</NativeSelectOption>
            <NativeSelectOption value="medium">Medium</NativeSelectOption>
            <NativeSelectOption value="low">Low</NativeSelectOption>
          </NativeSelect>
        </Label>
        <Label className="flex flex-col items-start gap-1.5 text-[13px] font-medium">
          Notes <span className="font-normal text-faint">(optional)</span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Why you want to watch it…"
            className="w-full resize-none"
          />
        </Label>
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          disabled={!selected || addItem.isPending}
          onClick={() => {
            if (!selected) return;
            addItem.mutate(
              // ponytail: mock-boundary shim — real Content → mock watchlist entry; drops when watchlist becomes a real endpoint
              {
                entry: {
                  title: selected.title,
                  type: selected.contentType === "tv" ? "series" : "movie",
                  year: selected.releaseYear ?? 0,
                },
                priority,
                notes,
              },
              {
                onSuccess: () => {
                  closeModal();
                  flash(`Added ${selected.title} to your watchlist`);
                },
              }
            );
          }}
        >
          Add to watchlist
        </Button>
      </div>
    </>
  );
}

function CreateGroupModal() {
  const { closeModal } = useModal();
  const { data: users = [] } = useUsers();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const createGroup = useCreateGroup();
  const others = users.filter((u) => u.id !== ME_ID);

  return (
    <>
      <div className="mb-4 font-heading text-[23px]">New group</div>
      <Label className="mb-4 flex flex-col items-start gap-1.5 text-[13px] font-medium">
        Group name
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunday Crew"
          className="w-full"
        />
      </Label>
      <div className="mb-2 text-[13px] font-medium">Invite members</div>
      <div className="flex flex-col gap-2">
        {others.map((u) => {
          const on = selected.includes(u.id);
          return (
            <ToggleRow
              key={u.id}
              selected={on}
              onClick={() => setSelected(on ? selected.filter((x) => x !== u.id) : [...selected, u.id])}
            >
              <NobarAvatar user={u} size={28} />
              <span className="flex-1 font-medium">{u.name}</span>
              <ToggleCheck selected={on} />
            </ToggleRow>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          disabled={!name.trim() || createGroup.isPending}
          onClick={() =>
            createGroup.mutate(
              { name, memberIds: selected },
              {
                onSuccess: () => {
                  closeModal();
                  flash("Group created");
                },
              }
            )
          }
        >
          Create group
        </Button>
      </div>
    </>
  );
}

function ManualWatchModal({
  payload,
}: {
  payload: { gid: string; tid: string; title: string; memberIds: string[] };
}) {
  const { closeModal } = useModal();
  const { data: users = [] } = useUsers();
  const [selected, setSelected] = useState<string[]>(payload.memberIds);
  const markWatched = useMarkWatchedManually(payload.gid, selected);
  const members = payload.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as typeof users;

  return (
    <>
      <div className="mb-1 font-heading text-[23px]">Mark as watched</div>
      <div className="mb-4 text-[14px] text-muted-foreground">{payload.title}</div>
      <div className="mb-2 text-[13px] font-medium">Who watched it?</div>
      <div className="flex flex-col gap-2">
        {members.map((u) => {
          const on = selected.includes(u.id);
          return (
            <ToggleRow
              key={u.id}
              selected={on}
              onClick={() => setSelected(on ? selected.filter((x) => x !== u.id) : [...selected, u.id])}
            >
              <NobarAvatar user={u} size={28} />
              <span className="flex-1 font-medium">{u.name}</span>
              <ToggleCheck selected={on} />
            </ToggleRow>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          disabled={selected.length === 0 || markWatched.isPending}
          onClick={() =>
            markWatched.mutate(payload.tid, {
              onSuccess: () => {
                closeModal();
                flash(`Marked watched for ${selected.length} member${selected.length > 1 ? "s" : ""}`);
              },
            })
          }
        >
          Confirm watched
        </Button>
      </div>
    </>
  );
}
