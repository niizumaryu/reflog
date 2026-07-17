"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteSchedule, getScheduleById, updateSchedule } from "@/lib/schedules";

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
      alert("予定を更新しました！");
      router.push(`/schedule/${id}`);
    } catch (error) {
      console.error(error);
      setFormError("更新に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      "この予定を削除しますか？この操作は取り消せません。",
    );
    if (!confirmed) return;

    setFormError(null);
    setIsDeleting(true);
    try {
      await deleteSchedule(id);
      router.push("/schedule");
    } catch (error) {
      console.error(error);
      setFormError("削除に失敗しました。もう一度お試しください。");
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
        <h1 className="mb-6 text-3xl font-black text-cyan-400">
          📅 予定を編集
        </h1>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">大会名</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className={`w-full rounded-xl border bg-white/5 p-3 ${
                fieldErrors.title ? "border-red-500/60" : "border-white/10"
              }`}
              placeholder="例：高校総体"
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full rounded-xl border bg-white/5 p-3 ${
                fieldErrors.date ? "border-red-500/60" : "border-white/10"
              }`}
            />
            {fieldErrors.date && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.date}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">時間</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">会場</label>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={200}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
              placeholder="例：○○体育館"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={2000}
              className="h-32 w-full rounded-xl border border-white/10 bg-white/5 p-3"
              placeholder="自由にメモを書いてください"
            />
          </div>

          {formError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {formError}
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
            onClick={handleDelete}
            disabled={busy}
            className="w-full rounded-xl border border-red-500/40 bg-red-500/10 py-4 text-lg font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {isDeleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </div>
    </main>
  );
}
