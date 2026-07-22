import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isNotificationSoftAskDismissed,
  markNotificationSoftAskDismissed,
} from "@/lib/notifications/settings";

// This project's vitest environment is "node" (no DOM/jsdom — see
// vitest.config.ts and README's "pure logic only" testing policy), so
// `window` doesn't exist as a global here. These two functions are the
// first in the codebase to need a real localStorage round-trip under
// test, so a minimal in-memory stub is set up locally rather than
// switching the whole suite to jsdom.
function installFakeWindow() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  };
}

beforeEach(() => {
  installFakeWindow();
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  vi.useRealTimers();
});

describe("notification soft-ask dismiss cooldown", () => {
  it("is not dismissed when never marked", () => {
    expect(isNotificationSoftAskDismissed()).toBe(false);
  });

  it("is dismissed immediately after marking", () => {
    markNotificationSoftAskDismissed();
    expect(isNotificationSoftAskDismissed()).toBe(true);
  });

  it("stops being dismissed once the cooldown window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    markNotificationSoftAskDismissed();
    expect(isNotificationSoftAskDismissed()).toBe(true);

    // 14 days is the cooldown; 15 days later it should be askable again.
    vi.setSystemTime(new Date("2026-01-16T00:00:00Z"));
    expect(isNotificationSoftAskDismissed()).toBe(false);
  });
});
