import type { MatchRecord } from "@/lib/matches";

// Pre-Supabase (Version 0.1/0.2) storage key. Kept only so first-login
// migration can pick up data recorded before accounts existed.
const LEGACY_STORAGE_KEY = "reflog_matches";

export function getLegacyLocalMatches(): MatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

export function clearLegacyLocalMatches(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
