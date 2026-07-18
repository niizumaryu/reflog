import { describe, expect, it } from "vitest";
import { generateTodayAdvice } from "@/lib/coach/todayAdvice";
import type { MatchRecord } from "@/lib/matches";

function buildMatch(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: "match-1",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    date: "2026-06-01",
    competition: "テスト大会",
    category: "",
    venue: "",
    homeTeam: "",
    awayTeam: "",
    refereePosition: "主審",
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
    matchCount: 1,
    partnerReferee: "",
    difficultCalls: "",
    freeNotes: "",
    entryType: "detailed",
    ...overrides,
  };
}

describe("generateTodayAdvice — JST date boundary", () => {
  // Regression: generateTodayAdvice used to compute "today"/"tomorrow" via
  // Date#toISOString (UTC), so during the early-morning JST window
  // (00:00–08:59 JST, i.e. still the previous UTC day) it looked for a
  // schedule on the *previous* calendar day instead of the real JST today.
  it("recognizes a schedule dated 'today' in JST even at 01:00 JST (which is still 'yesterday' in UTC)", () => {
    // 2026-07-19T01:00:00+09:00 == 2026-07-18T16:00:00Z.
    const referenceDate = new Date("2026-07-18T16:00:00Z");
    const matches = [buildMatch({ date: "2026-07-10" })];
    const schedules = [{ scheduled_date: "2026-07-19" }];

    const advice = generateTodayAdvice(matches, schedules, referenceDate);

    expect(advice.kind).toBe("match_today");
  });

  it("recognizes a schedule dated 'tomorrow' in JST at 23:00 JST", () => {
    // 2026-07-18T23:00:00+09:00 == 2026-07-18T14:00:00Z.
    const referenceDate = new Date("2026-07-18T14:00:00Z");
    const matches = [buildMatch({ date: "2026-07-10" })];
    const schedules = [{ scheduled_date: "2026-07-19" }];

    const advice = generateTodayAdvice(matches, schedules, referenceDate);

    expect(advice.kind).toBe("before_match_tomorrow");
  });

  it("does not misfire 'match_today' for a schedule that is genuinely yesterday in JST", () => {
    const referenceDate = new Date("2026-07-18T16:00:00Z"); // 2026-07-19 01:00 JST
    const matches = [buildMatch({ date: "2026-07-10" })];
    const schedules = [{ scheduled_date: "2026-07-18" }]; // yesterday in JST

    const advice = generateTodayAdvice(matches, schedules, referenceDate);

    expect(advice.kind).not.toBe("match_today");
    expect(advice.kind).not.toBe("before_match_tomorrow");
  });
});
