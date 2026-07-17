import Link from "next/link";
import { formatMatchDate, formatMatchup, getOverallAverage, type MatchRecord } from "@/lib/matches";

export function MatchCard({ match }: { match: MatchRecord }) {
  const average = getOverallAverage(match);
  const matchup = formatMatchup(match);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {formatMatchDate(match.date)}
        </span>
        <span className="whitespace-nowrap rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
          自己評価 {average > 0 ? average.toFixed(1) : "-"}
        </span>
      </div>
      <h2 className="mt-2 truncate text-base font-bold">
        {match.competition || "大会名未設定"}
      </h2>
      {matchup && (
        <p className="mt-1 truncate text-sm text-zinc-300">{matchup}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>{match.category || "カテゴリー未設定"}</span>
        <span>{match.refereePosition || "ポジション未設定"}</span>
      </div>
      {match.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.keywords.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300"
            >
              {tag}
            </span>
          ))}
          {match.keywords.length > 4 && (
            <span className="text-[11px] text-zinc-500">
              +{match.keywords.length - 4}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
