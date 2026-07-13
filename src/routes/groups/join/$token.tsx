import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useJoinGroup } from "@/hooks/use-groups";

export const Route = createFileRoute("/groups/join/$token")({ component: JoinGroupPage });

function JoinGroupPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const joinGroup = useJoinGroup();

  useEffect(() => {
    joinGroup.mutate(token, {
      onSuccess: (group) => navigate({ to: "/groups/$groupId", params: { groupId: group.id }, replace: true }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (joinGroup.isError) {
    return (
      <div className="py-14 text-center text-muted-foreground">
        This invite link isn't valid. Ask whoever sent it for a new one.
      </div>
    );
  }

  return <div className="py-14 text-center text-muted-foreground">Joining group…</div>;
}
