import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />
      <div className="relative space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
          404
        </p>
        <h1 className="text-xl font-bold">ページが見つかりません</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
          お探しのページは存在しないか、移動した可能性があります。URLをご確認いただくか、ホームからやり直してください。
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href="/"
            className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
