import { cn } from "@/lib/utils";
import type { User } from "@/types/domain";

/** Group members from the real API have no initials/hue — derive stable display props from name+id. */
export function toAvatarProps(member: { id: string; name: string }): Pick<User, "initials" | "hue"> {
  const initials =
    member.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  let hash = 0;
  for (let i = 0; i < member.id.length; i++) hash = (hash * 31 + member.id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return { initials, hue };
}

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
