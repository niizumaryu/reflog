"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { generateAiCoachComment, type AiCoachComment } from "@/lib/aiCoach";
import { generateAIReflection } from "@/lib/aiReflection";
import { generateMatchFeedback } from "@/lib/coach";
import { RatingInput } from "@/components/matches/RatingInput";
import {
  deleteMatch,
  formatMatchDate as formatDate,
  formatMatchup,
  getMatchById,
  getMatches,
  getOverallAverage,
  type MatchRecord,
} from "@/lib/matches";

type LoadState = "loading" | "ready" | "notfound" | "error";

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
  "rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white";

function CoachSection({
  label,
  text,
  emphasize,
}: {
  label: string;
  text: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-6 text-white ${
        emphasize
          ? "border-cyan-500/40 bg-cyan-500/10"
          : "border-white/10 bg-black/40"
      }`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
        {label}
      </p>
      {text}
    </div>
  );
}

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [allMatches, setAllMatches] = useState<MatchRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reflection, setReflection] = useState<string[] | null>(null);
  const [isReflecting, setIsReflecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [coachComment, setCoachComment] = useState<AiCoachComment | null>(
    null,
  );
  const [isCoaching, setIsCoaching] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMatchById(id)
      .then((data) => {
        if (!data) {
          setLoadState("notfound");
          return;
        }
        setMatch(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load match:", error);
        setLoadState("error");
      });
  }, [id]);

  useEffect(() => {
    getMatches()
      .then(setAllMatches)
      .catch((error: unknown) => {
        console.error("Failed to load matches for feedback:", error);
        setAllMatches([]);
      });
  }, []);

  const feedback = useMemo(
    () => (match ? generateMatchFeedback(match, allMatches) : null),
    [match, allMatches],
  );

  const handleDelete = async () => {
    if (!match || isDeleting) return;
    const confirmed = window.confirm(
      "この記録を削除しますか？この操作は取り消せません。",
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await deleteMatch(match.id);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "削除に失敗しました。もう一度お試しください。",
      );
      setIsDeleting(false);
      return;
    }
    router.push("/matches");
  };

  const handleAIReflection = async () => {
    if (!match) return;
    setIsReflecting(true);
    try {
      const tips = await generateAIReflection(match);
      setReflection(tips);
    } finally {
      setIsReflecting(false);
    }
  };

  const handleAiCoach = async () => {
    if (!match) return;
    setIsCoaching(true);
    try {
      const comment = await generateAiCoachComment(match);
      setCoachComment(comment);
    } finally {
      setIsCoaching(false);
    }
  };

  if (loadState === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#07131f] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#07131f] px-6 text-center text-white">
        <p className="text-sm text-red-400">
          記録の読み込みに失敗しました。通信環境をご確認のうえ、もう一度お試しください。
        </p>
        <Link href="/matches" className="text-sm font-semibold text-cyan-400">
          一覧に戻る
        </Link>
      </div>
    );
  }

  if (loadState === "notfound" || !match) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#07131f] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">記録が見つかりませんでした</p>
        <Link href="/matches" className="text-sm font-semibold text-cyan-400">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const average = getOverallAverage(match);
  const matchup = formatMatchup(match);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#07131f] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#07131f]/80 px-4 py-4 backdrop-blur">
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
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Match Detail
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">
            {match.competition || "大会名未設定"}
          </h1>
        </div>
        {match.entryType === "quick" && (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-400">
            ⚡ 30秒記録
          </span>
        )}
      </header>

      <main className="relative flex-1 space-y-8 px-4 pb-56 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <Section label="試合日">
            <div className={valueBoxClass}>
              {formatDate(match.date)}
              {match.startTime && ` ${match.startTime}`}
            </div>
          </Section>
          <Section label="自己評価平均">
            <div className={`${valueBoxClass} font-bold text-cyan-400`}>
              {average > 0 ? average.toFixed(1) : "未評価"}
            </div>
          </Section>
        </div>

        <Section label="大会名">
          <div className={valueBoxClass}>{match.competition || "-"}</div>
        </Section>

        <div className="grid grid-cols-2 gap-4">
          <Section label="カテゴリー">
            <div className={valueBoxClass}>{match.category || "-"}</div>
          </Section>
          <Section label="会場">
            <div className={valueBoxClass}>{match.venue || "-"}</div>
          </Section>
        </div>

        {matchup && (
          <Section label="対戦カード">
            <div className={valueBoxClass}>{matchup}</div>
          </Section>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Section label="担当ポジション">
            <div className={valueBoxClass}>{match.refereePosition || "未設定"}</div>
          </Section>
          <Section label="試合での役割">
            <div className={valueBoxClass}>{match.matchRole || "未設定"}</div>
          </Section>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            自己評価
          </p>
          <RatingInput label="判定" value={match.judgmentRating} readOnly />
          <RatingInput label="メカニクス" value={match.mechanicsRating} readOnly />
          <RatingInput label="ポジショニング" value={match.positionRating} readOnly />
          <RatingInput
            label="ゲームコントロール"
            value={match.gameControlRating}
            readOnly
          />
          <RatingInput
            label="コミュニケーション"
            value={match.communicationRating}
            readOnly
          />
          <RatingInput label="走力" value={match.staminaRating} readOnly />
        </div>

        <Section label="良かったこと">
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>
            {match.goodPoints || "-"}
          </div>
        </Section>

        <Section label="改善したいこと">
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>
            {match.improvements || "-"}
          </div>
        </Section>

        <Section label="次回意識すること">
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>
            {match.nextGoal || "-"}
          </div>
        </Section>

        <Section label="キーワード">
          {match.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {match.keywords.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div className={valueBoxClass}>-</div>
          )}
        </Section>

        {match.videoUrl && (
          <Section label="試合動画URL">
            <a
              href={match.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${valueBoxClass} block truncate text-cyan-400 underline`}
            >
              {match.videoUrl}
            </a>
          </Section>
        )}

        <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              AI振り返り
            </p>
            <button
              type="button"
              onClick={handleAIReflection}
              disabled={isReflecting}
              className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-bold text-black transition active:scale-[0.98] disabled:opacity-60"
            >
              {isReflecting ? "生成中..." : "AI振り返りを見る"}
            </button>
          </div>
          {reflection && (
            <ul className="space-y-2">
              {reflection.map((tip, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white"
                >
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                AI審判コーチ
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                記録内容をもとにしたコーチからのアドバイス
              </p>
            </div>
            <button
              type="button"
              onClick={handleAiCoach}
              disabled={isCoaching}
              className="shrink-0 rounded-full bg-cyan-500 px-4 py-2 text-xs font-bold text-black transition active:scale-[0.98] disabled:opacity-60"
            >
              {isCoaching ? "生成中..." : "コーチに聞く"}
            </button>
          </div>
          {coachComment && (
            <div className="space-y-3">
              <CoachSection label="今日の良かった点" text={coachComment.goodPoint} />
              <CoachSection
                label="次への改善ポイント"
                text={coachComment.improvementPoint}
              />
              <CoachSection label="次の試合テーマ" text={coachComment.nextTheme} />
              <CoachSection
                label="コーチから一言"
                text={coachComment.coachMessage}
                emphasize
              />
            </div>
          )}
        </div>

        {feedback && (
          <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                今回のフィードバック
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                過去の記録と比較したREFLOG AIコーチの分析
              </p>
            </div>

            {feedback.isQuickLog && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs leading-5 text-cyan-100">
                30秒記録のため簡易分析です。詳細を追加すると、より具体的なフィードバックを確認できます。
                <Link
                  href={`/matches/${match.id}/edit`}
                  className="mt-2 block w-full rounded-lg bg-cyan-500 py-2 text-center text-xs font-bold text-black transition active:scale-[0.98]"
                >
                  詳細を追加する
                </Link>
              </div>
            )}

            <CoachSection label="今回の良かった傾向" text={feedback.goodTrend} />
            <CoachSection label="今回の改善ポイント" text={feedback.improvementPoint} />
            <CoachSection label="過去と比べた変化" text={feedback.changeFromPast} />
            <CoachSection label="次回の意識ポイント" text={feedback.nextFocus} emphasize />

            {feedback.relatedKeywords.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  関連する頻出キーワード
                </p>
                <div className="flex flex-wrap gap-2">
                  {feedback.relatedKeywords.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[#07131f] via-[#07131f] to-transparent px-4 pb-6 pt-8">
        {match.entryType === "quick" && (
          <Link
            href={`/matches/${match.id}/edit`}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
          >
            詳細を追加する
          </Link>
        )}
        <Link
          href={`/matches/${match.id}/edit`}
          className={
            match.entryType === "quick"
              ? "flex h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-semibold tracking-wide text-white backdrop-blur transition active:scale-[0.98] active:bg-white/10"
              : "flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
          }
        >
          編集する
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-12 w-full rounded-xl border border-red-500/40 bg-red-500/10 text-sm font-semibold tracking-wide text-red-400 transition active:scale-[0.98] active:bg-red-500/20 disabled:opacity-60"
        >
          {isDeleting ? "削除中..." : "削除する"}
        </button>
        <Link
          href="/matches"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-semibold tracking-wide text-white backdrop-blur transition active:scale-[0.98] active:bg-white/10"
        >
          試合一覧へ戻る
        </Link>
      </div>
    </div>
  );
}
