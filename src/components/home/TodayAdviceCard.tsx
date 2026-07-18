import Link from "next/link";
import type { TodayAdvice } from "@/lib/coach";

// Renders the output of generateTodayAdvice (src/lib/coach/todayAdvice.ts).
// Kept separate from TodayReflogCard: that card answers "what's coming up
// and what did I last write," this one answers "what should I think about
// right now" — so their content never overlaps.
export default function TodayAdviceCard({ advice }: { advice: TodayAdvice | null }) {
  if (!advice) return null;

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-white/[0.03] p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        🤖 今日のAIアドバイス
      </p>
      <p className="mb-1 text-sm font-bold text-cyan-300">{advice.title}</p>
      <p className="text-sm leading-6 text-zinc-200">{advice.message}</p>
      {advice.supportingNote && (
        <p className="mt-1 text-[11px] text-zinc-400">{advice.supportingNote}</p>
      )}
      {(advice.primaryAction || advice.secondaryAction) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {advice.primaryAction && (
            <Link
              href={advice.primaryAction.href}
              className="flex h-11 flex-1 min-w-[140px] items-center justify-center rounded-xl bg-cyan-500 px-4 text-xs font-bold text-black transition active:scale-[0.98]"
            >
              {advice.primaryAction.label}
            </Link>
          )}
          {advice.secondaryAction && (
            <Link
              href={advice.secondaryAction.href}
              className="flex h-11 flex-1 min-w-[140px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white transition active:bg-white/10"
            >
              {advice.secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
