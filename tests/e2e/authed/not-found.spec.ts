import { expect, test } from "@playwright/test";

test("an unknown route while signed in shows the custom 404 with a way home", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist-12345");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("ページが見つかりません")).toBeVisible();

  const homeLink = page.getByRole("link", { name: "ホームに戻る" });
  const box = await homeLink.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await homeLink.click();
  await expect(page).toHaveURL("/");
});
