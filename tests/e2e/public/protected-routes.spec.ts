import { expect, test } from "@playwright/test";

// Unauthenticated users must be redirected to /login for every screen that
// requires a session — this is enforced by src/proxy.ts. These pages are the
// most commonly linked (from notifications, bookmarks, PWA shortcuts), so a
// regression here would let an unauthenticated visitor see a broken page
// instead of being sent to log in.
const PROTECTED_PATHS = [
  "/",
  "/matches",
  "/schedule",
  "/video-analysis",
  "/settings",
  "/notifications",
];

for (const path of PROTECTED_PATHS) {
  test(`unauthenticated visit to ${path} redirects to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
}

test("public pages remain reachable without a session", async ({ page }) => {
  for (const path of ["/login", "/terms", "/privacy", "/reset-password"]) {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
  }
});
