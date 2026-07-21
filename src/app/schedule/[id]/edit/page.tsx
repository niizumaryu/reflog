"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { queueToast } from "@/components/Toast";
import {
  SCHEDULE_NOT_FOUND_MESSAGE,
  deleteSchedule,
  getScheduleById,
  updateSchedule,
} from "@/lib/schedules";
import { LONG_TEXT_MAX, SHORT_TEXT_MAX } from "@/lib/inputLimits";
import { isSessionExpiredError } from "@/lib/sessionError";

type LoadState = "loading" | "ready" | "notfound" | "error";

type FieldErrors = {
  title?: string;
  date?: string;
};

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [memo, setMemo] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!id) return;
    getScheduleById(id)
      .then((schedule) => {
        if (!schedule) {
          setLoadState("notfound");
          return;
        }
        setTitle(schedule.title);
        setDate(schedule.date);
        setTime(schedule.time);
        setPlace(schedule.place);
        setMemo(schedule.memo);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load schedule:", error);
        setLoadState("error");
      });
  }, [id]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = "大会名を入力してください";
    if (!date) errors.date = "日付を選択してください";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdate = async () => {
    if (!id) return;
    setFormError(null);
    if (!validate()) return;

    setIsSaving(true);
    try {
      await updateSchedule(id, { title, date, time, place, memo });
      queueToast("予定を更新しました");
      router.push(`/schedule/${id}`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message === SCHEDULE_NOT_FOUND_MESSAGE) {
        // The record was deleted (e.g. from another tab) since this page
        // loaded it — reuse the same "notfound" screen the initial load
        // shows, rather than implying the save itself failed and inviting
        // a retry that will fail identically forever.
        setLoadState("notfound");
        return;
      }
      setFormError(
        isSessionExpiredError(message)
          ? message
          : "更新に失敗しました。通信環境をご確認のうえ、もう一度お試しください。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setFormError(null);
    setIsDeleting(true);
    try {
      await deleteSchedule(id);
      router.push("/schedule");
    } catch (error) {
      console.error(error);
      setFormError("削除に失敗しました。もう一度お試しください。");
      setIsDeleting(false);
      setIsConfirmOpen(false);
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

  if (loadState === "notfound") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#081824] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">予定が見つかりませんでした</p>
        <Link href="/schedule" className="text-sm font-semibold text-cyan-400">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const busy = isSaving || isDeleting;

  return (
    <main className="min-h-dvh bg-[#081824] p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href={`/schedule/${id}`}
          className="mb-4 inline-flex h-11 items-center gap-1 text-sm font-semibold text-cyan-400"
        >
          ← 戻る
        </Link>
        <h1 className="mb-6 text-3xl font-black text-cyan-400">
          📅 予定を編集
        </h1>

        <div className="space-y-4">
          <div>
            <label htmlFor="schedule-title" className="mb-1 block text-sm text-zinc-400">大会名</label>
            <input
              id="schedule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={SHORT_TEXT_MAX}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? "schedule-title-error" : undefined}
              className={`w-full rounded-xl border bg-white/5 p-3 ${
                fieldErrors.title ? "border-red-500/60" : "border-white/10"
              }`}
              placeholder="例：高校総体"
            />
            {fieldErrors.title && (
              <p id="schedule-title-error" role="alert" className="mt-1 text-xs text-red-400">
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="schedule-date" className="mb-1 block text-sm text-zinc-400">日付</label>
            <input
              id="schedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={fieldErrors.date ? true : undefined}
              aria-describedby={fieldErrors.date ? "schedule-date-error" : undefined}
              className={`w-full rounded-xl border bg-white/5 p-3 ${
                fieldErrors.date ? "border-red-500/60" : "border-white/10"
              }`}
            />
            {fieldErrors.date && (
              <p id="schedule-date-error" role="alert" className="mt-1 text-xs text-red-400">
                {fieldErrors.date}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="schedule-time" className="mb-1 block text-sm text-zinc-400">時間</label>
            <input
              id="schedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
            />
          </div>

          <div>
            <label htmlFor="schedule-place" className="mb-1 block text-sm text-zinc-400">会場</label>
            <input
              id="schedule-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={SHORT_TEXT_MAX}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
              placeholder="例：○○体育館"
            />
          </div>

          <div>
            <label htmlFor="schedule-memo" className="mb-1 block text-sm text-zinc-400">メモ</label>
            <textarea
              id="schedule-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={LONG_TEXT_MAX}
              className="h-32 w-full rounded-xl border border-white/10 bg-white/5 p-3"
              placeholder="自由にメモを書いてください"
            />
          </div>

          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <p>{formError}</p>
              {isSessionExpiredError(formError) && (
                <>
                  <p className="mt-1 text-xs leading-relaxed">
                    入力内容はこの画面に残っています。別のタブでログインし直してから、もう一度保存してください。
                  </p>
                  <Link
                    href="/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold underline underline-offset-2"
                  >
                    ログイン画面を開く
                  </Link>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleUpdate}
            disabled={busy}
            className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {isSaving ? "更新中..." : "更新する"}
          </button>

          <button
            onClick={() => setIsConfirmOpen(true)}
            disabled={busy}
            className="w-full rounded-xl border border-red-500/40 bg-red-500/10 py-4 text-lg font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {isDeleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="この予定を削除しますか？"
        targetName={title || undefined}
        description="この操作は取り消せません。"
        confirmLabel="削除する"
        confirmingLabel="削除中..."
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </main>
  );
}
