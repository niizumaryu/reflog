import { describe, expect, it, vi } from "vitest";
import { MAX_MATCHES_PER_FETCH } from "@/lib/queryLimits";

// Minimal thenable stand-in for a Supabase PostgrestFilterBuilder chain
// (.select/.order/.limit), recording every `.limit(n)` call so the test can
// assert the safety cap from src/lib/queryLimits.ts is actually wired into
// the query — not just defined and unused. `await`-ing the builder resolves
// to a fixed empty result, which is all getMatches() needs to complete.
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

describe("getMatches — query safety cap", () => {
  // Regression: src/lib/queryLimits.ts exists specifically to put a ceiling
  // on "fetch all of the current user's rows" queries (no pagination UI
  // exists for this list). The constant alone guards nothing if a future
  // edit to getMatches() drops the `.limit(...)` call — this asserts the
  // cap is actually applied, not just defined.
  it("applies MAX_MATCHES_PER_FETCH via .limit(...)", async () => {
    const limitCalls: number[] = [];
    vi.resetModules();
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        from: () => makeSelectBuilder(limitCalls),
      }),
    }));

    const { getMatches } = await import("@/lib/matches");
    await getMatches();

    expect(limitCalls).toEqual([MAX_MATCHES_PER_FETCH]);
  });
});
