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
- `src/lib/` — `api-client.ts` (fetch wrapper), `api.ts` (Zod schemas + calls), contexts, `decision-methods.ts` (IRV/ballot logic)
- `src/components/ui/` primitives, `src/components/nobar/` app-specific
- `@/` aliases `src/` (vite + tsconfig)

## Conventions
- **Prefer TanStack libraries** where applicable (Router, Query, Form, Table, etc.) before reaching for alternatives.
- **Zod-validate request bodies** before hitting the network, and parse API responses at the trust boundary. Define schemas in `api.ts` and derive types with `z.infer`.

## Gotchas
- **Mock vs real API split (mid-migration):** `use-auth`, `use-search`, and `useCurrentUser` (in `use-users.ts`) hit the real backend via `api-client.ts`. `useUsers`, `use-session`, `use-groups`, `use-history`, `use-watchlist` still import `src/lib/mock-api.ts`. Check before assuming a hook is live.
- **Auth:** session = HttpOnly cookie (JS can't read); localStorage CSRF token is the client-visible "has session" signal. Mutations send `X-CSRF-Token`. 401 triggers a single-flight refresh, then hard reload on failure.
- Env: `VITE_API_BASE_URL` (defaults `http://localhost:8080/api/v1`).
