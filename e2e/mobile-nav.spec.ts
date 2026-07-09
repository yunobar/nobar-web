import { test, expect, type Page } from "@playwright/test";

/**
 * The app treats a CSRF token in localStorage as the client-visible "signed in"
 * signal (the real session is an HttpOnly cookie JS can't read), so seeding it
 * lets the authenticated AppShell — and its bottom nav — render.
 */
async function gotoSignedInHome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("csrfToken", "e2e-test-token");
  });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
}

test.describe("mobile app shell", () => {
  test("bottom nav stays anchored to the viewport bottom while content scrolls", async ({
    page,
  }) => {
    await gotoSignedInHome(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const viewportHeight = viewport!.height;

    // Only the mobile bottom nav is visible at this breakpoint (the header nav is
    // `display: none`), so `nav:visible` resolves to it without coupling to classes.
    const bottomNav = page.locator("nav:visible");
    await expect(bottomNav).toBeVisible();
    for (const label of ["Home", "Find titles", "My list"]) {
      await expect(bottomNav.getByRole("link", { name: label })).toBeVisible();
    }

    // It sits flush against the bottom edge of the viewport.
    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();
    expect(navBox!.y + navBox!.height).toBeCloseTo(viewportHeight, 0);

    // Regression guard for the iOS floating-bar bug: the document must NOT be the
    // scroll container. With the body pinned, Safari never runs its URL-bar
    // show/hide animation, so the bar can't detach and float mid-transition.
    const bodyOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollHeight - document.documentElement.clientHeight,
    );
    expect(bodyOverflow).toBeLessThanOrEqual(1);

    // <main> is the real scroll container and has enough content to scroll.
    const main = page.locator("main");
    const canScroll = await main.evaluate((el) => el.scrollHeight > el.clientHeight + 4);
    expect(canScroll).toBe(true);

    // After scrolling the content, the body is still pinned and the nav has not moved.
    await main.evaluate((el) => el.scrollTo(0, 400));
    expect(await main.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollTop || document.body.scrollTop,
      ),
    ).toBe(0);

    const navBoxAfter = await bottomNav.boundingBox();
    expect(navBoxAfter!.y + navBoxAfter!.height).toBeCloseTo(viewportHeight, 0);
  });
});
