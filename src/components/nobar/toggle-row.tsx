import { cn } from "@/lib/utils";

export function ToggleRow({
  selected,
  onClick,
  disabled,
  children,
  className,
}: {
  selected: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-[11px] rounded-[10px] border px-[11px] py-[9px] text-left text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-brand-border bg-brand-soft" : "border-border bg-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ToggleCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[6px] border text-xs font-bold",
        selected ? "border-brand bg-brand text-brand-foreground" : "border-border text-transparent"
      )}
    >
      ✓
    </span>
  );
}
