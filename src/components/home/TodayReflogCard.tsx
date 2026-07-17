import Link from "next/link";
import { sortByNewest, type MatchRecord } from "@/lib/matches";

type ScheduleLike = { scheduled_date: string | null };

function truncate(text: string, max = 70): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// A reason to open REFLOG even on days without a match: how far the next
// game is, what the user said they'd focus on next, and one small action.
// Everything here is derived from data already loaded on the home page —
// no extra fetches, no AI calls.
export default function TodayReflogCard({
  matches,
  schedules,
  topImprovementKeyword,
}: {
  matches: MatchRecord[] | null;
  schedules: ScheduleLike[];
  topImprovementKeyword?: string;
}) {
  if (matches === null) return null;

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-white/[0.03] p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          📝 今日のREFLOG
        </p>
        <p className="mb-4 text-sm text-zinc-300">
          最初の試合を記録して、成長ログを始めましょう。
        </p>
        <Link
          href="/matches/quick"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-bold text-black transition active:scale-[0.98]"
        >
          30秒で記録する
        </Link>
      </div>
    );
  }

  const latest = sortByNewest(matches)[0];
  const reminderLabel = latest.nextGoal
    ? "次回意識すること"
    : latest.improvements
      ? "改善したいこと"
      : null;
  const reminderText = latest.nextGoal || latest.improvements || "";

  const nextScheduleDate =
    schedules.find((s) => s.scheduled_date)?.scheduled_date ?? null;
  const daysToNext = nextScheduleDate ? daysUntil(nextScheduleDate) : null;

  const todayAction = latest.nextGoal
    ? `次の試合で意識すること「${truncate(latest.nextGoal, 24)}」を確認する`
    : daysToNext !== null && daysToNext <= 3
      ? "次の予定に向けてスケジュールを確認する"
      : latest.improvements
        ? "前回の改善点を1つ見返す"
        : "今日の目標を1つ確認する";

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-white/[0.03] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        📝 今日のREFLOG
      </p>

      <div className="space-y-3 text-sm">
        {daysToNext !== null && (
          <p className="text-zinc-300">
            次の予定まで{" "}
            <span className="font-bold text-cyan-400">
              {daysToNext <= 0 ? "今日" : `あと${daysToNext}日`}
            </span>
          </p>
        )}

        {reminderLabel && (
          <div>
            <p className="text-[11px] text-zinc-500">前回の{reminderLabel}</p>
            <Link
              href={`/matches/${latest.id}`}
              className="text-zinc-200 underline decoration-white/20 underline-offset-2"
            >
              {truncate(reminderText)}
            </Link>
          </div>
        )}

        {topImprovementKeyword && (
          <p className="text-zinc-300">
            最近多い改善キーワード:{" "}
            <span className="font-bold text-cyan-400">
              {topImprovementKeyword}
            </span>
          </p>
        )}

        <div className="rounded-xl bg-cyan-500/10 px-3 py-2 text-cyan-200">
          ✅ 今日の一歩: {todayAction}
        </div>
      </div>
    </div>
  );
}
