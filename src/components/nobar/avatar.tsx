import { cn } from "@/lib/utils";
import type { User } from "@/types/domain";

export function NobarAvatar({
  user,
  size = 26,
  className,
  style,
}: {
  user: Pick<User, "initials" | "hue">;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `oklch(0.6 0.15 ${user.hue})`,
        boxShadow: "0 0 0 2px var(--surface)",
        ...style,
      }}
    >
      {user.initials}
    </div>
  );
}

export function AvatarStack({ users, size = 30 }: { users: Pick<User, "initials" | "hue">[]; size?: number }) {
  return (
    <div className="flex items-center">
      {users.map((u, i) => (
        <NobarAvatar key={i} user={u} size={size} style={{ marginLeft: i ? -8 : 0 }} />
      ))}
    </div>
  );
}
