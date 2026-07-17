import Link from "next/link";

// The two entry points into logging a match: a 30-second minimal record and
// the full detailed form. Kept as separate, clearly-labeled buttons so the
// user always knows which one matches how much time they have right now.
export default function RecordEntryPoints() {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/matches/quick"
        className="flex h-16 w-full flex-col items-center justify-center rounded-xl bg-cyan-500 text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
      >
        <span className="text-base font-bold tracking-wide">⚡ 30秒で記録する</span>
        <span className="text-[11px] font-semibold text-black/70">
          最低限の振り返りをすぐ保存
        </span>
      </Link>
      <Link
        href="/matches/new"
        className="flex h-16 w-full flex-col items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white backdrop-blur transition active:scale-[0.98] active:bg-white/10"
      >
        <span className="text-base font-semibold tracking-wide">詳しく記録する</span>
        <span className="text-[11px] text-zinc-400">
          自己評価や試合情報を丁寧に記録
        </span>
      </Link>
    </div>
  );
}
