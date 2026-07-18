import { describe, expect, it, vi } from "vitest";
import { MAX_SCHEDULES_PER_FETCH } from "@/lib/queryLimits";

// Minimal thenable stand-in for a Supabase PostgrestFilterBuilder: each
// chained call (.update/.eq/.select) returns the same object, and
// `await`-ing it resolves to the fixed `{ data, error }` result — enough to
// drive updateSchedule() without a real Supabase client/network.
function makeUpdateBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    update: () => builder,
    eq: () => builder,
    select: () => builder,
    then: (
      resolve: (value: { data: unknown; error: unknown }) => void,
    ) => resolve(result),
  };
  return builder;
}

// Same idea for the .select().order().order().limit() chain getSchedules()
// uses, recording `.limit(n)` calls so the queryLimits.ts safety cap can be
// asserted as actually applied, not just defined.
function makeSelectBuilder(limitCalls: number[]) {
  const builder = {
    select: () => builder,
    order: () => builder,
    limit: (n: number) => {
      limitCalls.push(n);
      return builder;
    },
    then: (resolve: (value: { data: unknown; error: unknown }) => void) =>
      resolve({ data: [], error: null }),
  };
  return builder;
}

describe("getSchedules — query safety cap", () => {
  it("applies MAX_SCHEDULES_PER_FETCH via .limit(...)", async () => {
    const limitCalls: number[] = [];
    vi.resetModules();
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        from: () => makeSelectBuilder(limitCalls),
      }),
    }));

    const { getSchedules } = await import("@/lib/schedules");
    await getSchedules();

    expect(limitCalls).toEqual([MAX_SCHEDULES_PER_FETCH]);
  });
});

describe("updateSchedule", () => {
  const baseInput = {
    title: "テスト大会",
    date: "2026-07-20",
    time: "10:00",
    place: "テスト体育館",
    memo: "",
  };

  // Regression: a bare `.update(...).eq("id", id)` with no `.select()`
  // returns `{ error: null }` even when the row no longer exists (e.g.
  // deleted from another tab), which used to make updateSchedule() resolve
  // successfully for an edit that silently changed nothing. See
  // src/app/schedule/[id]/edit/page.tsx for how this is surfaced to the user.
  it("throws SCHEDULE_NOT_FOUND_MESSAGE when the update matches zero rows", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        from: () => makeUpdateBuilder({ data: [], error: null }),
      }),
    }));

    const { updateSchedule, SCHEDULE_NOT_FOUND_MESSAGE } = await import("@/lib/schedules");
    await expect(updateSchedule("missing-id", baseInput)).rejects.toThrow(
      SCHEDULE_NOT_FOUND_MESSAGE,
    );
  });

  it("resolves without throwing when the update matches an existing row", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        from: () => makeUpdateBuilder({ data: [{ id: "existing-id" }], error: null }),
      }),
    }));

    const { updateSchedule } = await import("@/lib/schedules");
    await expect(updateSchedule("existing-id", baseInput)).resolves.toBeUndefined();
  });

  it("propagates a real Postgrest error instead of masking it as not-found", async () => {
    vi.resetModules();
    const dbError = new Error("connection reset");
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        from: () => makeUpdateBuilder({ data: null, error: dbError }),
      }),
    }));

    const { updateSchedule } = await import("@/lib/schedules");
    await expect(updateSchedule("some-id", baseInput)).rejects.toBe(dbError);
  });
});
