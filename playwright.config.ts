import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end test config.
 *
 * Tests live in ./e2e — outside src/ — so they are never part of the app's
 * production bundle (Vite only bundles the src entry, and @playwright/test is a
 * devDependency). See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "mobile-safari",
      use: {
        // iPhone form factor is where the bottom-nav anchoring bug reproduces.
        ...devices["iPhone 13"],
        // WebKit isn't provisioned in every CI/sandbox image; the layout
        // assertions here are engine-agnostic, so run them on Chromium's mobile
        // emulation. Swap back to WebKit locally with `browserName: "webkit"`.
        browserName: "chromium",
        // Allows pointing at a pre-installed Chromium (e.g. a cached sandbox
        // browser) instead of the one Playwright manages. Unset in normal CI.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],

  // Boot the Vite dev server for the tests and reuse it locally.
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
