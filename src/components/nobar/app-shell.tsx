import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Search, Bookmark } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrentUser } from "@/hooks/use-users";
import { ModalHost } from "@/components/nobar/modal-host";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Find titles", icon: Search },
  { to: "/watchlist", label: "My list", icon: Bookmark },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { data: me } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  const showWatchCTA = !location.pathname.startsWith("/watch") && !location.pathname.endsWith("/session");

  return (
    <div className="flex min-h-screen flex-col nb-scroll">
      <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_oklch,var(--bg)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1120px] items-center gap-2 px-4 sm:gap-5 sm:px-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex shrink-0 items-center gap-2 cursor-pointer"
          >
            <div className="flex size-[26px] items-center justify-center rounded-lg bg-brand text-[14px] font-bold text-brand-foreground">
              N
            </div>
            <span className="font-heading text-[21px] italic">Nobar</span>
          </button>

          <nav className="ml-2 hidden items-center gap-0.5 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="h-[34px] rounded-lg px-[13px] text-[13.5px] font-medium text-muted-foreground data-[status=active]:bg-secondary data-[status=active]:font-semibold data-[status=active]:text-foreground hover:text-foreground flex items-center"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          {showWatchCTA && (
            <Link
              to="/watch"
              className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-3 text-[13.5px] font-semibold text-brand-foreground shadow-[var(--shadow)] hover:opacity-90 sm:px-[15px]"
            >
              <span aria-hidden>✦</span>
              <span className="hidden sm:inline">Watch together</span>
            </Link>
          )}

          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[15px] hover:bg-secondary"
          >
            {theme === "light" ? "☾" : "☀"}
          </button>

          <div className="flex shrink-0 items-center gap-2 pl-1">
            <div className="flex size-8 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-brand-foreground">
              {me?.initials ?? ""}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-20">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-foreground"
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <ModalHost />
    </div>
  );
}
