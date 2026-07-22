import { describe, expect, it, vi } from "vitest";
import { MAX_MATCHES_PER_FETCH } from "@/lib/queryLimits";
import type { NewMatchInput } from "@/lib/matches";

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

describe("updateMatch", () => {
  const baseInput: NewMatchInput = {
    date: "2026-07-20",
    competition: "テスト大会",
    category: "",
    venue: "",
    homeTeam: "",
    awayTeam: "",
    refereePosition: "",
    matchRole: "",
    startTime: "",
    judgmentRating: 3,
    mechanicsRating: 3,
    positionRating: 3,
    gameControlRating: 3,
    communicationRating: 3,
    staminaRating: 3,
    goodPoints: "",
    improvements: "",
    nextGoal: "",
    keywords: [],
    videoUrl: "",
  } as unknown as NewMatchInput;

  // Minimal thenable stand-in for the .update().eq().select() chain
  // updateMatch() drives, plus the auth.getUser() call it makes first.
  function makeFakeClient(result: { data: unknown; error: unknown }) {
    const builder = {
      update: () => builder,
      eq: () => builder,
      select: () => builder,
      then: (
        resolve: (value: { data: unknown; error: unknown }) => void,
      ) => resolve(result),
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: () => builder,
    };
  }

  // Regression: .single() throws a raw Postgrest error ("JSON object
  // requested, multiple (or no) rows returned") when the update matches
  // zero rows (e.g. deleted from another tab since the edit page loaded
  // it), and src/app/matches/[id]/edit/page.tsx used to surface that raw
  // English message straight to the user instead of a Japanese, actionable
  // one. Mirrors the equivalent fix for updateSchedule in schedules.ts.
  it("throws MATCH_NOT_FOUND_MESSAGE when the update matches zero rows", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => makeFakeClient({ data: [], error: null }),
    }));

    const { updateMatch, MATCH_NOT_FOUND_MESSAGE } = await import("@/lib/matches");
    await expect(updateMatch("missing-id", baseInput)).rejects.toThrow(
      MATCH_NOT_FOUND_MESSAGE,
    );
  });

  it("resolves with the updated record when the update matches an existing row", async () => {
    vi.resetModules();
    const row = {
      id: "existing-id",
      date: "2026-07-20",
      competition: "テスト大会",
      category: "",
      venue: "",
      home_team: "",
      away_team: "",
      match_count: 1,
      partner_referee: "",
      referee_position: "",
      match_role: "",
      start_time: null,
      judgment_rating: 3,
      mechanics_rating: 3,
      position_rating: 3,
      game_control_rating: 3,
      communication_rating: 3,
      stamina_rating: 3,
      good_points: "",
      improvements: "",
      next_goal: "",
      difficult_calls: "",
      free_notes: "",
      keywords: [],
      video_url: "",
      created_at: "2026-07-20T00:00:00Z",
      updated_at: "2026-07-20T00:00:00Z",
    };
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => makeFakeClient({ data: [row], error: null }),
    }));

    const { updateMatch } = await import("@/lib/matches");
    const result = await updateMatch("existing-id", baseInput);
    expect(result.id).toBe("existing-id");
  });

  it("propagates a real Postgrest error instead of masking it as not-found", async () => {
    vi.resetModules();
    const dbError = new Error("connection reset");
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => makeFakeClient({ data: null, error: dbError }),
    }));

    const { updateMatch } = await import("@/lib/matches");
    await expect(updateMatch("some-id", baseInput)).rejects.toThrow("connection reset");
  });
});
