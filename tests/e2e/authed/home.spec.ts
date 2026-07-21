import { expect, test } from "@playwright/test";

test("home screen loads for a signed-in user with no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: /30秒で記録する/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /詳しく記録する/ })).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("settings and notifications icons are reachable and sized for touch", async ({ page }) => {
  await page.goto("/");
  const notificationsLink = page.getByRole("link", { name: "通知" });
  const settingsLink = page.getByRole("link", { name: "設定" });
  for (const link of [notificationsLink, settingsLink]) {
    const box = await link.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await settingsLink.click();
  await expect(page).toHaveURL("/settings");
});
