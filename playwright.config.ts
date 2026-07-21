import path from "node:path";
import { defineConfig } from "@playwright/test";

// Next 16 refuses to start a second `next dev` in the same project directory
// (enforced via a lockfile, independent of port), so this targets the
// default dev port and always reuses an already-running dev server instead
// of trying to spawn a competing one.
const PORT = process.env.E2E_PORT ?? "3000";
const baseURL = `http://localhost:${PORT}`;

// Authenticated E2E coverage requires a *dedicated test* Supabase project
// (never production) plus a disposable test account. Without those two env
// vars the "authed-*" projects below are simply not registered, so
// `npx playwright test` still runs cleanly (public-flow coverage only) in
// any environment that hasn't been given test credentials. No auth bypass
// exists in application code — see tests/e2e/auth.setup.ts.
const hasTestAccount = Boolean(
  process.env.E2E_TEST_USER_EMAIL && process.env.E2E_TEST_USER_PASSWORD,
);

const VIEWPORTS = {
  "mobile-360": { width: 360, height: 800 },
  "mobile-390": { width: 390, height: 844 },
  "tablet-768": { width: 768, height: 1024 },
  "desktop-1440": { width: 1440, height: 900 },
} as const;

const authStatePath = path.resolve(__dirname, "tests/e2e/.auth/user.json");

const publicProjects = Object.entries(VIEWPORTS).map(([name, viewport]) => ({
  name: `public-${name}`,
  testDir: "./tests/e2e/public",
  use: { viewport },
}));

const authProjects = hasTestAccount
  ? [
      {
        name: "auth-setup",
        testDir: "./tests/e2e",
        testMatch: /auth\.setup\.ts/,
        use: { viewport: VIEWPORTS["mobile-390"] },
      },
      ...Object.entries(VIEWPORTS).map(([name, viewport]) => ({
        name: `authed-${name}`,
        testDir: "./tests/e2e/authed",
        dependencies: ["auth-setup"],
        use: { viewport, storageState: authStatePath },
      })),
    ]
  : [];

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [...publicProjects, ...authProjects],
});
