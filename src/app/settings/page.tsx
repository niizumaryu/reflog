"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { downloadMatchesCsv } from "@/lib/csv";
import { getMatches } from "@/lib/matches";
import { createClient } from "@/lib/supabase/client";

function SettingsRow({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition active:bg-white/[0.06]"
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-zinc-500"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportCsv = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const matches = await getMatches();
      if (matches.length === 0) {
        setError("エクスポートするデータがありません");
        return;
      }
      downloadMatchesCsv(matches);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "エクスポートに失敗しました",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    const confirmed1 = window.confirm(
      "アカウントを削除しますか？すべての試合記録とプロフィールが完全に削除され、元に戻せません。",
    );
    if (!confirmed1) return;
    const confirmed2 = window.confirm(
      "本当に削除してよろしいですか？この操作は取り消せません。",
    );
    if (!confirmed2) return;

    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "アカウントの削除に失敗しました");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (deleteError) {
      setIsDeleting(false);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "アカウントの削除に失敗しました",
      );
    }
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
            Settings
          </p>
          <h1 className="text-lg font-bold tracking-tight">設定</h1>
        </div>
      </header>

      <main className="relative flex-1 space-y-8 px-4 py-6">
        {user && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              ログイン中のアカウント
            </p>
            <p className="mt-1 truncate text-sm text-white">{user.email}</p>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <SettingsRow
            href="/settings/profile"
            label="プロフィールを編集する"
            description="名前・都道府県・審判級などを設定"
          />
        </div>

        <div className="space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-orange-500">
            データ
          </p>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition active:bg-white/[0.06] disabled:opacity-60"
          >
            <div>
              <p className="text-sm font-semibold text-white">
                データをエクスポート
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                すべての試合記録をCSVでダウンロード
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-500"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-orange-500">
            アカウント
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm font-semibold text-white transition active:bg-white/10"
          >
            ログアウト
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="flex w-full items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-sm font-semibold text-red-400 transition active:bg-red-500/20 disabled:opacity-60"
          >
            {isDeleting ? "削除中..." : "アカウントを削除する"}
          </button>
        </div>
      </main>
    </div>
  );
}
