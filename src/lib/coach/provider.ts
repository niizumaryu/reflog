import type { MatchRecord } from "@/lib/matches";
import { analyzeRecords } from "@/lib/coach/analyze";
import { generateMatchFeedback } from "@/lib/coach/matchFeedback";
import { generateTodayAdvice } from "@/lib/coach/todayAdvice";
import type {
  CoachAnalysisInput,
  CoachAnalysisResult,
  CoachProvider,
  MatchFeedback,
  ScheduleLike,
  TodayAdvice,
} from "@/lib/coach/types";

// Today's implementation: pure rule-based analysis of the user's own
// records, no external API, no API key required. Swapping in a real
// generative-AI backend later (OpenAI/Claude/etc.) means writing a new class
// that implements CoachProvider and pointing `coachProvider` at it — no UI
// call site needs to change.
export class RuleBasedCoachProvider implements CoachProvider {
  analyzeRecords(input: CoachAnalysisInput): CoachAnalysisResult {
    return analyzeRecords(input);
  }

  generateMatchFeedback(match: MatchRecord, allMatches: MatchRecord[]): MatchFeedback {
    return generateMatchFeedback(match, allMatches);
  }

  generateTodayAdvice(
    matches: MatchRecord[],
    schedules: ScheduleLike[],
    referenceDate?: Date,
  ): TodayAdvice {
    return generateTodayAdvice(matches, schedules, referenceDate);
  }
}

export const coachProvider: CoachProvider = new RuleBasedCoachProvider();
