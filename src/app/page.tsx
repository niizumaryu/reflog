"use client";

import Link from "next/link";
import { Toast, useQueuedToast } from "@/components/Toast";

export default function Home() {
  const toastMessage = useQueuedToast();

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden bg-black px-6 py-14 text-white">
      <Toast message={toastMessage} />
      {/* ambient glow for a premium feel */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]" />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.5em] text-orange-500">
          Basketball Referee
        </span>
        <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
          REF<span className="text-orange-500">LOG</span>
        </h1>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
        <p className="max-w-xs text-sm leading-6 text-zinc-400">
          試合の記録を、もっとスマートに。
        </p>
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/matches/new"
          className="flex h-14 w-full items-center justify-center rounded-xl bg-orange-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] transition active:scale-[0.98]"
        >
          新しい試合を記録する
        </Link>
        <Link
          href="/matches"
          className="flex h-14 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-base font-semibold tracking-wide text-white backdrop-blur transition active:scale-[0.98] active:bg-white/10"
        >
          過去の記録を見る
        </Link>
      </div>
    </div>
  );
}
