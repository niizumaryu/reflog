"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { queueToast } from "@/components/Toast";
import { QuickMatchForm } from "@/components/matches/QuickMatchForm";
import { getMatches, saveMatch, type NewMatchInput } from "@/lib/matches";
import { maybeNotifyAiAdvice } from "@/lib/notifications/aiAdvice";

export default function QuickMatchPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: NewMatchInput) => {
    setError(null);
    setIsSaving(true);
    try {
      const created = await saveMatch(values);
      queueToast("保存しました");
      getMatches()
        .then((allMatches) => maybeNotifyAiAdvice(allMatches))
        .catch((notifyError: unknown) => {
          console.error("Failed to trigger AI advice notification:", notifyError);
        });
      router.push(`/matches/${created.id}`);
    } catch (saveError) {
      setIsSaving(false);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存に失敗しました。もう一度お試しください。",
      );
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#07131f] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#07131f]/80 px-4 py-4 backdrop-blur">
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Quick Log
          </p>
          <h1 className="text-lg font-bold tracking-tight">30秒で記録する</h1>
        </div>
      </header>

      <QuickMatchForm
        onSubmit={handleSubmit}
        isSubmitting={isSaving}
        submitError={error}
        submitLabel="保存する"
        submittingLabel="保存中..."
      />
    </div>
  );
}
