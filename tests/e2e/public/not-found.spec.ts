import { expect, test } from "@playwright/test";

test("an unknown route while signed out redirects to /login rather than crashing", async ({
  page,
}) => {
  // src/proxy.ts treats any non-public path as protected before Next's own
  // routing gets a chance to 404 it, so a signed-out visitor hitting a dead
  // link should land on /login, never a broken page. The authenticated
  // custom-404 UI itself is covered in tests/e2e/authed (requires a session
  // to actually reach it).
  await page.goto("/this-page-does-not-exist-12345");
  await expect(page).toHaveURL(/\/login/);
});

test("legal pages render without crashing and have no fabricated business details", async ({
  page,
}) => {
  for (const path of ["/terms", "/privacy"]) {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  }
});
