import Link from "next/link";

export function EmptyState({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <p className="text-sm text-zinc-400">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-bold text-black transition active:scale-[0.98]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
