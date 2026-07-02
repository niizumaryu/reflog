import { queueToast } from "@/components/Toast";
import { getLegacyLocalMatches } from "@/lib/localMatchesLegacy";
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
    matchCount: match.matchCount,
    partnerReferee: match.partnerReferee,
    refereePosition: match.refereePosition,
    judgmentRating: match.judgmentRating,
    positionRating: match.positionRating,
    communicationRating: match.communicationRating,
    goodPoints: match.goodPoints,
    improvements: match.improvements,
    nextGoal: match.nextGoal,
    difficultCalls: match.difficultCalls,
    freeNotes: match.freeNotes,
  }));

  await saveMatchesBulk(inputs, userId);
  localStorage.setItem(flagKey, "true");
  queueToast(`${legacyMatches.length}件のローカル記録を同期しました`);
}
