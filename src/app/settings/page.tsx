"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ProfileAvatar } from "@/components/AvatarIcons";
import { downloadMatchesCsv } from "@/lib/csv";
import { getMatches } from "@/lib/matches";
import { createClient } from "@/lib/supabase/client";

const BASE_STORE_URL = "https://bskreferee.base.shop/";

function SettingsRow({
  href,
  label,
  description,
  external,
}: {
  href: string;
  label: string;
  description?: string;
  external?: boolean;
}) {
  const content = (
    <>
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
        {external ? <path d="M7 17L17 7M7 7h10v10" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </>
  );

  const className =
    "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition active:bg-white/[0.06]";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

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

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "アカウントを削除しますか？この機能は現在準備中です。",
    );
    if (!confirmed) return;
    setDeleteMessage(
      "アカウント削除は現在準備中です。今しばらくお待ちください。",
    );
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

      <main className="relative mx-auto w-full max-w-xl flex-1 space-y-8 px-4 py-6">
        {user && (
          <Link
            href="/settings/profile"
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition active:bg-white/[0.06]"
          >
            <ProfileAvatar
              avatarType={profile?.avatarType ?? "default"}
              avatarKey={profile?.avatarKey ?? "basketball"}
              avatarUrl={profile?.avatarUrl ?? null}
              size={56}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {profile?.name || profile?.username || "プロフィール未設定"}
              </p>
              {profile?.username && (
                <p className="truncate text-xs text-orange-400">
                  @{profile.username}
                </p>
              )}
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {user.email}
              </p>
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
              className="shrink-0 text-zinc-500"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
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
            description="ユーザー名・アイコン・都道府県・審判級などを設定"
          />
          <SettingsRow
            href={BASE_STORE_URL}
            label="REFLOG STORE"
            description="資料・テンプレートをBASEショップで見る"
            external
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
            className="flex w-full items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-sm font-semibold text-red-400 transition active:bg-red-500/20"
          >
            アカウントを削除する
          </button>
          {deleteMessage && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
              {deleteMessage}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
