export const MATCHES_STORAGE_KEY = "reflog_matches";

export type MatchRecord = {
  id: string;
  createdAt: string;
  date: string;
  competition: string;
  category: string;
  matchCount: number;
  partnerReferee: string;
  judgmentRating: number;
  positionRating: number;
  communicationRating: number;
  goodPoints: string;
  improvements: string;
  nextGoal: string;
};

export type NewMatchInput = Omit<MatchRecord, "id" | "createdAt">;

export function getMatches(): MatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MATCHES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveMatch(input: NewMatchInput): MatchRecord {
  const record: MatchRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const matches = getMatches();
  matches.push(record);
  localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));
  return record;
}

export function getMatchById(id: string): MatchRecord | undefined {
  return getMatches().find((match) => match.id === id);
}

export function deleteMatch(id: string): void {
  const matches = getMatches().filter((match) => match.id !== id);
  localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));
}
