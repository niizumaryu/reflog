import { queueToast } from "@/components/Toast";
import { clearLegacyLocalMatches, getLegacyLocalMatches } from "@/lib/localMatchesLegacy";
import { saveMatchesBulk, type NewMatchInput } from "@/lib/matches";

function migrationFlagKey(userId: string): string {
  return `reflog_migrated_${userId}`;
}

export async function migrateLocalDataIfNeeded(userId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const flagKey = migrationFlagKey(userId);
  if (localStorage.getItem(flagKey)) return;

  const legacyMatches = getLegacyLocalMatches();
  if (legacyMatches.length === 0) {
    localStorage.setItem(flagKey, "true");
    return;
  }

  const inputs: NewMatchInput[] = legacyMatches.map((match) => ({
    date: match.date,
    competition: match.competition,
    category: match.category,
    // Pre-Supabase local records predate these fields entirely, so they
    // fall back to empty/zero defaults rather than undefined.
    venue: match.venue ?? "",
    homeTeam: match.homeTeam ?? "",
    awayTeam: match.awayTeam ?? "",
    matchCount: match.matchCount,
    partnerReferee: match.partnerReferee,
    refereePosition: match.refereePosition,
    matchRole: match.matchRole ?? "",
    startTime: match.startTime ?? "",
    judgmentRating: match.judgmentRating,
    mechanicsRating: match.mechanicsRating ?? 0,
    positionRating: match.positionRating,
    gameControlRating: match.gameControlRating ?? 0,
    communicationRating: match.communicationRating,
    staminaRating: match.staminaRating ?? 0,
    goodPoints: match.goodPoints,
    improvements: match.improvements,
    nextGoal: match.nextGoal,
    difficultCalls: match.difficultCalls,
    freeNotes: match.freeNotes,
    keywords: match.keywords ?? [],
    videoUrl: match.videoUrl ?? "",
  }));

  await saveMatchesBulk(inputs, userId);
  localStorage.setItem(flagKey, "true");
  clearLegacyLocalMatches();
  queueToast(`${legacyMatches.length}件のローカル記録を同期しました`);
}
