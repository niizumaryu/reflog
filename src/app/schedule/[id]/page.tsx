"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteSchedule,
  formatScheduleDate,
  formatScheduleTime,
  getScheduleById,
  type ScheduleRecord,
} from "@/lib/schedules";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      {children}
    </div>
  );
}

const valueBoxClass =
  "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white";

type LoadState = "loading" | "ready" | "notfound" | "error";

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [schedule, setSchedule] = useState<ScheduleRecord | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getScheduleById(id)
      .then((data) => {
        if (!data) {
          setLoadState("notfound");
          return;
        }
        setSchedule(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load schedule:", error);
        setLoadState("error");
      });
  }, [id]);

  const handleDelete = async () => {
    if (!schedule) return;
    const confirmed = window.confirm(
      "この予定を削除しますか？この操作は取り消せません。",
    );
    if (!confirmed) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteSchedule(schedule.id);
      router.push("/schedule");
    } catch (error) {
      console.error(error);
      setDeleteError("削除に失敗しました。もう一度お試しください。");
      setIsDeleting(false);
    }
  };

  if (loadState === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#081824] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#081824] px-6 text-center text-white">
        <p className="text-sm text-red-400">
          予定の読み込みに失敗しました。通信環境をご確認のうえ、もう一度お試しください。
        </p>
        <Link href="/schedule" className="text-sm font-semibold text-cyan-400">
          一覧に戻る
        </Link>
      </div>
    );
  }

  if (loadState === "notfound" || !schedule) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#081824] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">予定が見つかりませんでした</p>
        <Link href="/schedule" className="text-sm font-semibold text-cyan-400">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#081824] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#081824]/80 px-4 py-4 backdrop-blur">
        <Link
          href="/schedule"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Schedule Detail
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">
            {schedule.title || "予定名未設定"}
          </h1>
        </div>
      </header>

      <main className="relative flex-1 space-y-6 px-4 pb-44 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <Section label="日付">
            <div className={valueBoxClass}>{formatScheduleDate(schedule.date)}</div>
          </Section>
          <Section label="時間">
            <div className={valueBoxClass}>{formatScheduleTime(schedule.time)}</div>
          </Section>
        </div>

        <Section label="タイトル">
          <div className={valueBoxClass}>{schedule.title || "-"}</div>
        </Section>

        <Section label="場所">
          <div className={valueBoxClass}>{schedule.place || "-"}</div>
        </Section>

        <Section label="メモ">
          <div className={`${valueBoxClass} whitespace-pre-wrap break-words`}>
            {schedule.memo || "-"}
          </div>
        </Section>

        {deleteError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {deleteError}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[#081824] via-[#081824] to-transparent px-4 pb-6 pt-8">
        <Link
          href={`/schedule/${schedule.id}/edit`}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
        >
          編集する
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-14 w-full rounded-xl border border-red-500/40 bg-red-500/10 text-base font-semibold tracking-wide text-red-400 transition active:scale-[0.98] active:bg-red-500/20 disabled:opacity-50"
        >
          {isDeleting ? "削除中..." : "削除する"}
        </button>
      </div>
    </div>
  );
}
