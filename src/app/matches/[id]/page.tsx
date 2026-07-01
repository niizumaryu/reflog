"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteMatch, getMatchById, type MatchRecord } from "@/lib/matches";

function formatDate(dateStr: string) {
  if (!dateStr) return "日付未設定";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

function RatingDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`flex h-9 w-9 flex-1 items-center justify-center rounded-full border text-sm font-bold ${
            n === value
              ? "border-orange-500 bg-orange-500 text-black"
              : "border-white/10 bg-white/5 text-zinc-500"
          }`}
        >
          {n}
        </div>
      ))}
    </div>
  );
}

const valueBoxClass =
  "rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white";

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [match, setMatch] = useState<MatchRecord | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!id) return;
    setMatch(getMatchById(id) ?? null);
  }, [id]);

  const handleDelete = () => {
    if (!match) return;
    const confirmed = window.confirm(
      "この記録を削除しますか？この操作は取り消せません。",
    );
    if (!confirmed) return;
    deleteMatch(match.id);
    router.push("/matches");
  };

  if (match === undefined) {
    return <div className="min-h-dvh bg-black" />;
  }

  if (match === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="text-sm text-zinc-400">記録が見つかりませんでした</p>
        <Link href="/matches" className="text-sm font-semibold text-orange-500">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/matches"
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
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            Match Detail
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">
            {match.competition || "大会名未設定"}
          </h1>
        </div>
      </header>

      <main className="relative flex-1 space-y-8 px-4 pb-40 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <Section label="日付">
            <div className={valueBoxClass}>{formatDate(match.date)}</div>
          </Section>
          <Section label="試合数">
            <div className={valueBoxClass}>{match.matchCount || 0}試合</div>
          </Section>
        </div>

        <Section label="大会名">
          <div className={valueBoxClass}>{match.competition || "-"}</div>
        </Section>

        <Section label="カテゴリー">
          <div className={valueBoxClass}>{match.category || "-"}</div>
        </Section>

        <Section label="パートナー審判">
          <div className={valueBoxClass}>{match.partnerReferee || "-"}</div>
        </Section>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            自己評価
          </p>
          <Section label="判定">
            <RatingDisplay value={match.judgmentRating} />
          </Section>
          <Section label="ポジション">
            <RatingDisplay value={match.positionRating} />
          </Section>
          <Section label="コミュニケーション">
            <RatingDisplay value={match.communicationRating} />
          </Section>
        </div>

        <Section label="良かったこと">
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>
            {match.goodPoints || "-"}
          </div>
        </Section>

        <Section label="改善点">
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>
            {match.improvements || "-"}
          </div>
        </Section>

        <Section label="次回の目標">
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>
            {match.nextGoal || "-"}
          </div>
        </Section>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black via-black to-transparent px-4 pb-6 pt-8">
        <button
          type="button"
          className="h-14 w-full rounded-xl bg-orange-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] transition active:scale-[0.98]"
        >
          編集する
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-14 w-full rounded-xl border border-red-500/40 bg-red-500/10 text-base font-semibold tracking-wide text-red-400 transition active:scale-[0.98] active:bg-red-500/20"
        >
          削除する
        </button>
      </div>
    </div>
  );
}
