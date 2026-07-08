import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PREVIEW_ROWS = [
  { rank: 1, title: "Severance", meta: "Series · 3 interested", winner: true },
  { rank: 2, title: "Shōgun", meta: "Series · 3 interested", winner: false },
  { rank: 3, title: "Dune: Part Two", meta: "Movie · 2 interested", winner: false },
];

export function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="ml-auto flex w-full max-w-[560px] flex-col justify-center px-8 py-12 md:px-[8vw]">
        <div className="mb-11 flex items-center gap-[9px]">
          <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-brand text-[16px] font-bold text-brand-foreground">
            N
          </div>
          <span className="font-heading text-[26px] italic tracking-[.3px]">Nobar</span>
        </div>

        <h1 className="mb-3 font-heading text-[42px] leading-[1.08] font-normal tracking-[-0.5px]">
          Decide what to
          <br />
          watch together<span className="text-brand">.</span>
        </h1>
        <p className="mb-8 max-w-[38ch] text-[15px] text-muted-foreground">
          Everyone keeps their own watchlist. Your group merges them automatically — then
          settles the pick in under a minute.
        </p>

        <form
          className="flex max-w-[360px] flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
          }}
        >
          <Label className="flex flex-col items-start gap-1.5 text-[13px] font-medium">
            Email
            <Input type="email" placeholder="you@nonton.app" className="h-10 w-full" />
          </Label>
          <Label className="flex flex-col items-start gap-1.5 text-[13px] font-medium">
            Password
            <Input type="password" placeholder="••••••••" className="h-10 w-full" />
          </Label>
          <Button type="submit" className="mt-1.5 h-[42px] text-[14px]">
            Sign in
          </Button>
          <div className="my-1 flex items-center gap-3 text-xs text-faint">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="h-[42px] text-[14px]" onClick={signIn}>
            Continue as Alex <span className="ml-1 text-faint">(demo)</span>
          </Button>
        </form>
        <p className="mt-7 text-xs text-faint">
          New here? <span className="cursor-pointer text-brand">Create an account</span>
        </p>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden border-l border-border bg-brand-soft p-10 md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_10%,var(--accent)_0%,transparent_45%)] opacity-[0.18]" />
        <div className="relative w-full max-w-[360px] rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
          <div className="mb-3.5 text-xs font-semibold tracking-[.4px] text-muted-foreground uppercase">
            Apartment 4B · tonight
          </div>
          <div className="flex flex-col gap-2">
            {PREVIEW_ROWS.map((row) => (
              <div
                key={row.rank}
                className={
                  row.winner
                    ? "flex items-center gap-3 rounded-[11px] border border-brand-border bg-brand-soft p-[11px]"
                    : "flex items-center gap-3 rounded-[11px] border border-border p-[11px]"
                }
              >
                <div
                  className={
                    "font-heading text-[22px] leading-none " +
                    (row.winner ? "text-brand" : "text-faint")
                  }
                >
                  {row.rank}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{row.title}</div>
                  <div className="text-xs text-muted-foreground">{row.meta}</div>
                </div>
                {row.winner && (
                  <div className="text-[11px] font-semibold text-brand">WINNER</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            Ranked choice · decided in 47s
          </div>
        </div>
      </div>
    </div>
  );
}
