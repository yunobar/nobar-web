# nobar-web

React SPA for group movie/TV watch decisions. TanStack Router (file-based) + TanStack Query, Tailwind v4, Zod, base-ui.

## Commands
- `bun install` — deps (repo uses bun, not npm)
- `bun run dev` — Vite dev server; calls the backend directly at `http://localhost:8080` (backend allows CORS from `localhost:5173`)
- `bun run build` — `tsc -b && vite build`
- `bun run lint` — oxlint (no separate test runner configured)

## Architecture
- `src/routes/` — file-based routes; `routeTree.gen.ts` is GENERATED, never edit by hand
- `src/hooks/` — TanStack Query hooks (one per domain)
- `src/lib/` — `api-client.ts` (fetch wrapper), `api.ts` (Zod schemas + calls), `session-socket.ts` (WS client for live decision sessions), contexts, `decision-methods.ts` (method display metadata — tally/winner logic is server-side)
- `src/components/ui/` primitives, `src/components/nobar/` app-specific
- `@/` aliases `src/` (vite + tsconfig)

## Conventions
- **Prefer TanStack libraries** where applicable (Router, Query, Form, Table, etc.) before reaching for alternatives.
- **Zod-validate request bodies** before hitting the network, and parse API responses at the trust boundary. Define schemas in `api.ts` and derive types with `z.infer`.

## Gotchas
- **Mock vs real API split (mid-migration):** `use-auth`, `use-search`, `use-session`, and `useCurrentUser`/`useGroups`/`useGroup`/`useMergedWatchlist` hit the real backend via `api-client.ts`. `useUsers`, `use-history`, `use-watchlist`, and `useGroupHistory`/`useGroupSessions` (in `use-groups.ts`, Layer-3 Watch Ledger — not built yet) still import `src/lib/mock-api.ts`. Check before assuming a hook is live.
- **Decision engine backend is live** (verified 2026-07-14 against `album` running locally): create/vote/rank/select/finalize + `WS /sessions/:id/live` all confirmed working end-to-end, including the pub/sub push (independently verified by opening a raw WebSocket alongside the app and observing `tally`/`winner` frames arrive). Known contract gaps papered over with judgment calls (each marked `ponytail:` at the call site): no per-participant "who's voted" list (session route shows an aggregate count instead of a per-person progress panel), no "everyone's in" push for majority/ranked (client infers it by comparing tally turnout to participant count and calls `/finalize` itself). **Ranked has no round-by-round IRV history at all** — `album`'s `rankedTally` hardcodes `round: 1` and `eliminatedCandidateIds: []` always (a live first-preference snapshot only; real elimination happens inside `finalize` and is never exposed) — the frontend's ranked winner view is winner-only, same as every other method, not a round breakdown. Don't reintroduce round-accumulation client-side without a backend contract change first. **Random has no chooser concept server-side** — `album`'s `Get()` only computes `currentChooserProfileId` for `round_robin` (always `null` for `random`), so `RandomRun` is intentionally un-gated: any participant can spin, unlike Round Robin. **Random's `/select` 400s** ("not a round robin session") — this backend only accepts `/select` for `round_robin`; Random skips straight to `/finalize` after the spin animation, no select call at all.
- **Auth:** session = HttpOnly cookie (JS can't read); localStorage CSRF token is the client-visible "has session" signal. Mutations send `X-CSRF-Token`. 401 triggers a single-flight refresh, then hard reload on failure.
- Env: `VITE_API_BASE_URL` (defaults `http://localhost:8080/api/v1`).
