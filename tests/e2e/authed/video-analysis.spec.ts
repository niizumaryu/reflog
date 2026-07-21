import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("video analysis upload screen shows the demo disclaimer prominently", async ({ page }) => {
  await page.goto("/video-analysis/new");
  await expect(page.getByText("デモ解析パイプライン")).toBeVisible();
  await expect(page.getByText(/AIは公式な判定を行いません/)).toBeVisible();
  await expect(page.getByText(/実際のAIモデルによる解析ではないデモ表示/)).toBeVisible();
});

test("video analysis list also carries the demo disclaimer, not just the upload screen", async ({
  page,
}) => {
  await page.goto("/video-analysis");
  await expect(page.getByText(/デモ|AIは公式な判定を行いません/).first()).toBeVisible();
});

test("selecting an over-limit video shows a clear, actionable error instead of uploading", async ({
  page,
}) => {
  await page.goto("/video-analysis/new");

  // A real (sparse) file on disk so Playwright can hand the browser an
  // accurate file.size without allocating 300MB of test-process memory or
  // transferring it over CDP.
  const oversizedPath = path.join(os.tmpdir(), `reflog-e2e-oversized-${Date.now()}.mp4`);
  const oversizedBytes = 300 * 1024 * 1024 + 1024; // just over MAX_VIDEO_SIZE_BYTES
  const fd = fs.openSync(oversizedPath, "w");
  fs.ftruncateSync(fd, oversizedBytes);
  fs.closeSync(fd);

  try {
    await page.locator('input[type="file"]').setInputFiles(oversizedPath);
    await expect(page.getByText(/容量が大きすぎます/)).toBeVisible();
    // Must not silently proceed into the upload phase.
    await expect(page.getByRole("button", { name: "アップロードして解析を開始" })).toHaveCount(0);
  } finally {
    fs.rmSync(oversizedPath, { force: true });
  }
});

test("selecting an unsupported file type is rejected with a clear message", async ({ page }) => {
  await page.goto("/video-analysis/new");
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a video"),
  });
  await expect(page.getByText(/対応していない動画形式です/)).toBeVisible();
});
