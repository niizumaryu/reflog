import { expect, test } from "@playwright/test";

test("notification settings screen loads and stays within the viewport", async ({ page }) => {
  await page.goto("/settings/notifications");
  await expect(page.getByRole("heading", { name: "通知設定" })).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);

  await page.getByRole("link", { name: "通知一覧を見る" }).click();
  await expect(page).toHaveURL("/notifications");
});
