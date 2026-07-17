import Link from "next/link";
import type { BadgeProgress } from "@/lib/coach";

export default function BadgePreviewCard({
  recentBadges,
  totalEarned,
  totalBadges,
}: {
  recentBadges: BadgeProgress[];
  totalEarned: number;
  totalBadges: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          🏅 バッジ ({totalEarned}/{totalBadges})
        </p>
        <Link href="/growth/badges" className="text-xs font-semibold text-cyan-400">
          すべて見る →
        </Link>
      </div>

      {recentBadges.length === 0 ? (
        <p className="text-sm text-zinc-500">
          記録を続けると、ここに獲得したバッジが表示されます。
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {recentBadges.map((badge) => (
            <div
              key={badge.key}
              className="flex flex-1 min-w-[90px] flex-col items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-3 text-center"
            >
              <span className="text-2xl" aria-hidden>
                {badge.icon}
              </span>
              <span className="text-[11px] font-semibold text-white">{badge.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
