import { test, expect, type Page } from "@playwright/test";

/**
 * ADR-0006: a participant who didn't create the session has no way to learn its
 * id except the group-detail banner (`activeSession` on GET /groups/:id). This
 * test exercises exactly that path for the second participant, then confirms
 * the live WS tally/winner reach both clients without a reload.
 *
 * Requires the real `album` backend running locally (VITE_API_BASE_URL,
 * defaults to http://localhost:8080/api/v1) — same precondition as the rest of
 * the live decision-engine surface (see CLAUDE.md).
 */

const API_BASE = process.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
const PASSWORD = "Test-Password-1!";

interface GroupMember {
  id: string;
  name: string;
}
interface Group {
  id: string;
  inviteToken: string;
  members: GroupMember[];
}
interface ContentResult {
  id: string;
  title: string;
}
interface SessionResp {
  id: string;
}

// Registers + logs in a fresh user in `page`'s browser context, and seeds the
// CSRF token into localStorage the same way the real login flow does — the
// app treats it as the client-visible "signed in" signal.
async function registerAndLogIn(page: Page, email: string): Promise<string> {
  await page.request.post(`${API_BASE}/auth/register`, {
    data: { email, password: PASSWORD, passwordConfirmation: PASSWORD },
  });
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  const json = await res.json();
  const csrfToken: string = json?.data?.csrfToken ?? json?.csrfToken;

  await page.goto("/");
  await page.evaluate((token) => window.localStorage.setItem("csrfToken", token), csrfToken);
  await page.reload();
  return csrfToken;
}

// Setup-only helper hitting the backend directly (bypasses the app's Zod
// schemas on purpose — those are exercised elsewhere; this just seeds state).
async function apiCall<T>(
  page: Page,
  csrfToken: string,
  method: "GET" | "POST",
  path: string,
  data?: unknown
): Promise<T> {
  const headers: Record<string, string> = method !== "GET" ? { "X-CSRF-Token": csrfToken } : {};
  const res = await page.request.fetch(`${API_BASE}${path}`, { method, data, headers });
  const json = await res.json();
  if (!res.ok()) throw new Error(`${method} ${path} -> ${res.status()}: ${JSON.stringify(json)}`);
  return (json?.data ?? json) as T;
}

test("second participant discovers a live session via the group banner and sees it finalize live", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const stamp = Date.now();
  const csrfA = await registerAndLogIn(pageA, `e2e-a-${stamp}@nobar.test`);
  const csrfB = await registerAndLogIn(pageB, `e2e-b-${stamp}@nobar.test`);

  // A creates the group; B joins via invite token (setup only — not what's under test).
  const group = await apiCall<Group>(pageA, csrfA, "POST", "/groups", {});
  await apiCall(pageB, csrfB, "POST", `/groups/join/${group.inviteToken}`);
  const groupAfterJoin = await apiCall<Group>(pageA, csrfA, "GET", `/groups/${group.id}`);
  const participantIds = groupAfterJoin.members.map((m) => m.id);

  // Two real catalog candidates, added to A's watchlist so they surface in the merge.
  const results = await apiCall<ContentResult[]>(pageA, csrfA, "GET", "/content/search?q=batman");
  expect(results.length).toBeGreaterThanOrEqual(2);
  const [candidate1, candidate2] = results;
  await apiCall(pageA, csrfA, "POST", "/watchlist", { contentId: candidate1.id, priority: "high" });
  await apiCall(pageA, csrfA, "POST", "/watchlist", { contentId: candidate2.id, priority: "medium" });

  // A creates the session — the creator gets the id straight back from POST,
  // same as the real create flow (ADR-0006).
  const session = await apiCall<SessionResp>(pageA, csrfA, "POST", `/groups/${group.id}/sessions`, {
    method: "majority",
    participantIds,
    candidateContentIds: [candidate1.id, candidate2.id],
  });
  await pageA.goto(`/groups/${group.id}/session/${session.id}`);

  // B has no id to paste — the group-detail banner is the only route in.
  await pageB.goto(`/groups/${group.id}`);
  await pageB.locator("button", { hasText: "in progress" }).click();
  await expect(pageB).toHaveURL(new RegExp(`/groups/${group.id}/session/${session.id}$`));

  // A votes; B — without reloading — sees the tally move via the WS push.
  await pageA.getByRole("button", { name: candidate1.title, exact: false }).click();
  await expect(pageB.getByText("1 of 2 locked in")).toBeVisible();

  // B votes for the same candidate; both auto-finalize and see the same winner.
  await pageB.getByRole("button", { name: candidate1.title, exact: false }).click();
  await expect(pageA.getByText("Tonight you're watching")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("Tonight you're watching")).toBeVisible({ timeout: 10_000 });
  await expect(pageA.getByText(candidate1.title)).toBeVisible();
  await expect(pageB.getByText(candidate1.title)).toBeVisible();
});
