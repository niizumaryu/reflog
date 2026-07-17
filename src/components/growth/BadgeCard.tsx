import type { BadgeProgress } from "@/lib/coach";
import { formatMatchDate } from "@/lib/matches";

export function BadgeCard({ badge }: { badge: BadgeProgress }) {
  const earned = badge.status === "earned";
  const percent = Math.min(
    100,
    Math.round((badge.progressCurrent / badge.progressTarget) * 100),
  );

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        earned
          ? "border-cyan-500/40 bg-cyan-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
            earned ? "bg-cyan-500/20" : "bg-white/5 grayscale opacity-50"
          }`}
          aria-hidden
        >
          {badge.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">{badge.name}</p>
            {earned && (
              <span className="shrink-0 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-black">
                獲得済み
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">{badge.description}</p>
          <p className="mt-1 text-[11px] text-zinc-500">条件: {badge.condition}</p>
          {earned && badge.earnedAt && (
            <p className="mt-1 text-[11px] text-cyan-400">
              獲得日: {formatMatchDate(badge.earnedAt.slice(0, 10))}
            </p>
          )}
        </div>
      </div>

      {!earned && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
            <span>進捗</span>
            <span>
              {badge.progressCurrent} / {badge.progressTarget}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-500/60"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
