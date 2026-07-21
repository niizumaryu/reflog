import { expect, test } from "@playwright/test";

// Covers add -> detail -> edit -> delete for schedules, including the
// destructive ConfirmDialog that replaced window.confirm.
test("schedule: add, view detail, edit, then delete via the confirm dialog", async ({
  page,
}) => {
  const title = `E2Eテスト予定-${Date.now()}`;

  await page.goto("/schedule/new");
  await page.getByLabel("大会名").fill(title);
  await page.getByLabel("日付").fill("2026-05-01");
  await page.getByRole("button", { name: "保存する" }).click();

  await expect(page).toHaveURL("/schedule", { timeout: 15_000 });
  await expect(page.getByRole("status").filter({ hasText: "予定を保存しました" })).toBeVisible();

  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/schedule\/[0-9a-f-]+$/);
  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole("link", { name: "編集する" }).click();
  await expect(page).toHaveURL(/\/schedule\/[0-9a-f-]+\/edit$/);
  const updatedTitle = `${title}-更新済み`;
  await page.getByLabel("大会名").fill(updatedTitle);
  await page.getByRole("button", { name: "更新する" }).click();

  await expect(page).toHaveURL(/\/schedule\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("status").filter({ hasText: "予定を更新しました" })).toBeVisible();
  await expect(page.getByText(updatedTitle)).toBeVisible();

  await page.getByRole("button", { name: "削除する" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(updatedTitle)).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /削除しますか/ })).toBeVisible();

  // Escape must close without deleting.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "削除する" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL("/schedule", { timeout: 15_000 });
  await expect(page.getByText(updatedTitle)).toHaveCount(0);
});
