import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGroups } from "@/hooks/use-groups";
import { useModal } from "@/lib/modal-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/groups/")({ component: GroupsPage });

function GroupsPage() {
  const { data: groups = [] } = useGroups();
  const { openCreateGroupModal } = useModal();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[32px] font-normal tracking-[-.3px]">Groups</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Collaborative views that merge everyone's watchlist.
          </p>
        </div>
        <Button onClick={openCreateGroupModal} className="h-10 gap-1.5 px-4">
          <span className="text-[17px] leading-none">+</span> New group
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => navigate({ to: "/groups/$groupId", params: { groupId: g.id } })}
            className="animate-nb-fade cursor-pointer rounded-[15px] border border-border bg-surface p-5 shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1 text-[17px] font-semibold">{g.name}</div>
              <span className="shrink-0 text-lg text-faint">→</span>
            </div>
            <div className="mt-4 border-t border-border pt-3.5 text-[13px] text-muted-foreground">
              <b className="text-foreground">{g.memberCount}</b> member{g.memberCount === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
