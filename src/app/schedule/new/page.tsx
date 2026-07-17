"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSchedule } from "@/lib/schedules";

type FieldErrors = {
  title?: string;
  date?: string;
};

export default function NewSchedulePage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [memo, setMemo] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = "大会名を入力してください";
    if (!date) errors.date = "日付を選択してください";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await saveSchedule({ title, date, time, place, memo });
      alert("予定を保存しました！");
      router.push("/schedule");
    } catch (error) {
      console.error(error);
      setFormError("保存に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#081824] p-6 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-3xl font-black text-cyan-400">
          📅 予定を追加
        </h1>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">大会名</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
              placeholder="例：○○体育館"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
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
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </main>
  );
}
