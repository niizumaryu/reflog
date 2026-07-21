import path from "node:path";
import { test as setup } from "@playwright/test";

// This project only exists when E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD
// are set (see playwright.config.ts), so this file always has both. It signs
// in through the real UI against whatever NEXT_PUBLIC_SUPABASE_URL points to
// (.env.local) — that MUST be a dedicated test project, never production.
// There is no test-only auth bypass in application code.
const authFile = path.resolve(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL!;
  const password = process.env.E2E_TEST_USER_PASSWORD!;

  await page.goto("/login");
  await page.getByPlaceholder("メールアドレス").fill(email);
  await page.getByPlaceholder("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });

  await page.context().storageState({ path: authFile });
});
