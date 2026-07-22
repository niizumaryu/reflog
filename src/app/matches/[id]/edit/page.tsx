"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { queueToast } from "@/components/Toast";
import { MatchForm } from "@/components/matches/MatchForm";
import {
  deleteMatch,
  getMatchById,
  getMatches,
  MATCH_NOT_FOUND_MESSAGE,
  updateMatch,
  type MatchRecord,
  type NewMatchInput,
} from "@/lib/matches";
import { maybeNotifyAiAdvice } from "@/lib/notifications/aiAdvice";

type LoadState = "loading" | "ready" | "notfound" | "error";

export default function EditMatchPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
      .catch((loadError: unknown) => {
        console.error("Failed to load match:", loadError);
        setLoadState("error");
      });
  }, [id]);

  const handleSubmit = async (values: NewMatchInput) => {
    if (!id) return;
    setError(null);
    setIsSaving(true);
    try {
      await updateMatch(id, values);
      queueToast("更新しました");
      getMatches()
        .then((allMatches) => maybeNotifyAiAdvice(allMatches))
        .catch((notifyError: unknown) => {
          console.error("Failed to trigger AI advice notification:", notifyError);
        });
      router.push(`/matches/${id}`);
    } catch (saveError) {
      setIsSaving(false);
      const message = saveError instanceof Error ? saveError.message : "";
      if (message === MATCH_NOT_FOUND_MESSAGE) {
        // Deleted from another tab/device since this page loaded — reuse
        // the same "notfound" screen the initial load shows, rather than
        // implying the save itself failed and inviting a retry that will
        // fail identically forever.
        setLoadState("notfound");
        return;
      }
      setError(message || "更新に失敗しました。もう一度お試しください。");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteMatch(id);
      router.push("/matches");
    } catch (deleteError) {
      setIsDeleting(false);
      setIsConfirmOpen(false);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "削除に失敗しました。もう一度お試しください。",
      );
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

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#07131f] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#07131f]/80 px-4 py-4 backdrop-blur">
        <Link
          href={`/matches/${id}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Edit Record
          </p>
          <h1 className="text-lg font-bold tracking-tight">試合ログを編集</h1>
        </div>
      </header>

      <MatchForm
        initialValues={match}
        onSubmit={handleSubmit}
        isSubmitting={isSaving || isDeleting}
        submitError={error}
        submitLabel="更新する"
        submittingLabel="更新中..."
        secondaryAction={{
          label: "削除する",
          loadingLabel: "削除中...",
          isLoading: isDeleting,
          onClick: () => setIsConfirmOpen(true),
        }}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        title="この記録を削除しますか？"
        targetName={match.competition || undefined}
        description="この操作は取り消せません。"
        confirmLabel="削除する"
        confirmingLabel="削除中..."
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
