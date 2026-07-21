import { expect, test } from "@playwright/test";

// Covers the app's primary "quick record" funnel end-to-end: home -> quick
// entry -> save -> detail page -> delete via the ConfirmDialog (replacing
// the old window.confirm/alert). This also doubles as a regression test for
// double-submit protection on the save button.
test("quick record: create, view, then delete via the confirm dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /30秒で記録する/ }).click();
  await expect(page).toHaveURL("/matches/quick");

  const competitionName = `E2Eテスト大会-${Date.now()}`;
  await page.locator('input[type="date"]').fill("2026-04-01");
  await page.getByPlaceholder("例: 春季リーグ戦").fill(competitionName);
  await page.getByRole("button", { name: "主審", exact: true }).click();
  await page.getByRole("group", { name: /改善したい/ }).getByRole("button", { name: "5" }).click();

  const saveButton = page.getByRole("button", { name: "保存する" });
  await saveButton.click();

  // Double-submit guard: the button must disable/relabel immediately so a
  // second physical click can't fire a duplicate save request.
  await expect(page.getByRole("button", { name: "保存中..." })).toBeVisible();

  await expect(page).toHaveURL(/\/matches\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByText(competitionName)).toBeVisible();

  // Toast is queued in sessionStorage and rendered globally (root layout) —
  // it should now be visible on this page even though it navigated here
  // from a different route than where the save happened.
  await expect(page.getByRole("status").filter({ hasText: "保存しました" })).toBeVisible();

  await page.getByRole("button", { name: "削除する" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(competitionName)).toBeVisible();

  await dialog.getByRole("button", { name: "削除する" }).click();
  await expect(page).toHaveURL("/matches", { timeout: 15_000 });
});
