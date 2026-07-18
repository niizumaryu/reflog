"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white antialiased">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
            Error
          </p>
          <h1 className="text-xl font-bold">アプリの読み込みに失敗しました</h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
            予期しないエラーが発生しました。もう一度お試しください。改善しない場合はアプリを再起動してください。
          </p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white transition active:scale-[0.98]"
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
