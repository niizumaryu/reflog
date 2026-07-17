import { describe, expect, it } from "vitest";
import { SingleFlightGuard } from "@/lib/video-analysis/submitGuard";

describe("SingleFlightGuard", () => {
  it("allows the first start", () => {
    const guard = new SingleFlightGuard();
    expect(guard.tryStart()).toBe(true);
  });

  it("rejects a second start while the first is still in flight (double-submit protection)", () => {
    const guard = new SingleFlightGuard();
    expect(guard.tryStart()).toBe(true);
    expect(guard.tryStart()).toBe(false);
    expect(guard.tryStart()).toBe(false);
  });

  it("allows a new start again after finish() releases it", () => {
    const guard = new SingleFlightGuard();
    expect(guard.tryStart()).toBe(true);
    guard.finish();
    expect(guard.tryStart()).toBe(true);
  });

  it("reports isActive correctly across the lifecycle", () => {
    const guard = new SingleFlightGuard();
    expect(guard.isActive).toBe(false);
    guard.tryStart();
    expect(guard.isActive).toBe(true);
    guard.finish();
    expect(guard.isActive).toBe(false);
  });

  it("finish() is safe to call even if never started", () => {
    const guard = new SingleFlightGuard();
    expect(() => guard.finish()).not.toThrow();
    expect(guard.tryStart()).toBe(true);
  });
});
