"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { queueToast } from "@/components/Toast";
import { saveMatch, type RefereePosition } from "@/lib/matches";

function RatingSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-11 w-11 flex-1 items-center justify-center rounded-full border text-sm font-bold transition ${
              selected
                ? "border-orange-500 bg-orange-500 text-black"
                : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

export default function NewMatchPage() {
  const router = useRouter();
  const [refereePosition, setRefereePosition] = useState<RefereePosition>("");
  const [judgment, setJudgment] = useState(0);
  const [position, setPosition] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);

    try {
      await saveMatch({
        date: String(formData.get("date") ?? ""),
        competition: String(formData.get("competition") ?? ""),
        category: String(formData.get("category") ?? ""),
        matchCount: Number(formData.get("matchCount") ?? 0),
        partnerReferee: String(formData.get("partnerReferee") ?? ""),
        refereePosition,
        judgmentRating: judgment,
        positionRating: position,
        communicationRating: communication,
        goodPoints: String(formData.get("goodPoints") ?? ""),
        improvements: String(formData.get("improvements") ?? ""),
        nextGoal: String(formData.get("nextGoal") ?? ""),
        difficultCalls: String(formData.get("difficultCalls") ?? ""),
        freeNotes: String(formData.get("freeNotes") ?? ""),
      });
    } catch (saveError) {
      setIsSaving(false);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存に失敗しました。もう一度お試しください。",
      );
      return;
    }

    queueToast("保存しました");
    router.push("/");
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            New Record
          </p>
          <h1 className="text-lg font-bold tracking-tight">新しい試合を記録する</h1>
        </div>
      </header>

      <form
        id="new-match-form"
        onSubmit={handleSubmit}
        className="relative flex-1 space-y-8 px-4 pb-32 pt-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="日付">
            <input type="date" name="date" className={inputClass} />
          </Field>
          <Field label="試合数">
            <input
              type="number"
              name="matchCount"
              min={1}
              placeholder="1"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="大会名">
          <input
            type="text"
            name="competition"
            placeholder="例: 春季リーグ戦"
            className={inputClass}
          />
        </Field>

        <Field label="カテゴリー">
          <input
            type="text"
            name="category"
            placeholder="例: U15男子 / 社会人リーグ"
            className={inputClass}
          />
        </Field>

        <Field label="パートナー審判">
          <input
            type="text"
            name="partnerReferee"
            placeholder="例: 山田 太郎"
            className={inputClass}
          />
        </Field>

        <Field label="担当ポジション">
          <div className="flex gap-2">
            {(["主審", "副審"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setRefereePosition(p)}
                className={`h-11 flex-1 rounded-xl border text-sm font-bold transition ${
                  refereePosition === p
                    ? "border-orange-500 bg-orange-500 text-black"
                    : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            自己評価
          </p>
          <Field label="判定">
            <RatingSelector value={judgment} onChange={setJudgment} />
          </Field>
          <Field label="ポジション">
            <RatingSelector value={position} onChange={setPosition} />
          </Field>
          <Field label="コミュニケーション">
            <RatingSelector value={communication} onChange={setCommunication} />
          </Field>
        </div>

        <Field label="良かったこと">
          <textarea
            name="goodPoints"
            rows={3}
            placeholder="今日の試合で上手くいったことを記録しましょう"
            className={inputClass}
          />
        </Field>

        <Field label="改善点">
          <textarea
            name="improvements"
            rows={3}
            placeholder="次に活かしたい課題を記録しましょう"
            className={inputClass}
          />
        </Field>

        <Field label="次回の目標">
          <textarea
            name="nextGoal"
            rows={3}
            placeholder="次の試合で意識したいことを書きましょう"
            className={inputClass}
          />
        </Field>

        <Field label="難しかった判定">
          <textarea
            name="difficultCalls"
            rows={3}
            placeholder="判断に迷ったプレーや難しかった判定を記録しましょう"
            className={inputClass}
          />
        </Field>

        <Field label="自由メモ">
          <textarea
            name="freeNotes"
            rows={3}
            placeholder="その他、自由に記録しておきたいことがあれば"
            className={inputClass}
          />
        </Field>
      </form>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-black via-black to-transparent px-4 pb-6 pt-8">
        {error && (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          form="new-match-form"
          disabled={isSaving}
          className="h-14 w-full rounded-xl bg-orange-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {isSaving ? "保存中..." : "記録を保存する"}
        </button>
      </div>
    </div>
  );
}
