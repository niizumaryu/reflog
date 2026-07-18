"use client";

import Link from "next/link";
import { isSessionExpiredError } from "@/lib/sessionError";

const DEFAULT_FALLBACK_MESSAGE =
  "データの取得に失敗しました。通信環境をご確認のうえ、もう一度お試しください。";

// Shared read-path error banner: pages that fetch data on mount (dashboard,
// growth, growth/charts, growth/badges, home, matches/schedule/video-analysis
// lists, ...) all hit the same three outcomes — success, "no data yet", or
// "the fetch failed" — and that last one used to always render the same
// generic "check your connection" text, even when the underlying cause was
// a session that expired mid-visit (getMatches()/getSchedules()/etc. throw
// a distinct "ログインが必要です" for that case — see src/lib/sessionError.ts).
// A user in that state would see "check your connection" forever, with no
// path back to a working page short of guessing they should log in again.
// This centralizes the distinction so every read page gets it consistently.
export function LoadErrorBanner({
  rawMessage,
  fallbackMessage = DEFAULT_FALLBACK_MESSAGE,
}: {
  rawMessage: string | null;
  fallbackMessage?: string;
}) {
  if (!rawMessage) return null;

  const sessionExpired = isSessionExpiredError(rawMessage);
  const displayMessage = sessionExpired ? rawMessage : fallbackMessage;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
    >
      <p>{displayMessage}</p>
      {sessionExpired && (
        <>
          <p className="text-xs leading-relaxed">
            別のタブでログインし直してから、もう一度お試しください。
          </p>
          <Link
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-semibold underline underline-offset-2"
          >
            ログイン画面を開く
          </Link>
        </>
      )}
    </div>
  );
}
