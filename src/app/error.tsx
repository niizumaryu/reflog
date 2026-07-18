"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-red-500/20 blur-[100px]" />
      <div className="relative space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
          Error
        </p>
        <h1 className="text-xl font-bold">問題が発生しました</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
          予期しないエラーが発生しました。入力していた内容が失われている場合があります。もう一度お試しいただくか、ホームに戻ってください。
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            もう一度試す
          </button>
          <Link
            href="/"
            className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-white transition active:bg-white/10"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
