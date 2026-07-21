import { expect, test } from "@playwright/test";

test.describe("login page", () => {
  test("shows the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /REFLOG/ })).toBeVisible();
    await expect(page.getByPlaceholder("メールアドレス")).toBeVisible();
    await expect(page.getByPlaceholder("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン", exact: true })).toBeVisible();
  });

  test("shows a validation-relevant error for a bad login instead of crashing", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("メールアドレス").fill("not-a-real-user@example.com");
    await page.getByPlaceholder("パスワード").fill("wrong-password-123");
    await page.getByRole("button", { name: "ログイン", exact: true }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    // Still on /login — a failed login must never silently "succeed" into a
    // protected page.
    await expect(page).toHaveURL(/\/login/);
  });

  test("toggles to the sign-up form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /新規登録$/ }).click();
    await expect(page.getByRole("button", { name: "新規登録" })).toBeVisible();
  });
});

test.describe("responsive layout — login", () => {
  test("has no horizontal overflow and keeps the submit button on-screen", async ({
    page,
  }) => {
    await page.goto("/login");
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);

    const submitButton = page.getByRole("button", { name: "ログイン", exact: true });
    const box = await submitButton.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    if (box && viewport) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      // 44x44 CSS px is the tap-target guideline this app targets for
      // primary actions.
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
