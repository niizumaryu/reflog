"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeRedirectPath } from "@/lib/safeRedirect";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Same-origin only — see src/lib/safeRedirect.ts. This value is embedded
  // into the OAuth/email redirectTo URL below and later read back by
  // /auth/callback, so it must never be allowed to carry an absolute URL.
  const next = sanitizeRedirectPath(searchParams.get("next"));

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setIsSubmitting(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setIsSubmitting(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setMessage(
        "確認メールを送信しました。メール内のリンクをクリックしてログインを完了してください。",
      );
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-black px-6 py-12 text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/25 blur-[100px]" />

      <div className="relative flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.5em] text-orange-500">
            Basketball Referee
          </span>
          <h1 className="text-5xl font-black tracking-tight">
            REF<span className="text-orange-500">LOG</span>
          </h1>
          <p className="text-sm text-zinc-400">
            {mode === "signin" ? "ログインして始める" : "新規登録して始める"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C40.5 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
            />
          </svg>
          Googleでログイン
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-px flex-1 bg-white/10" />
          または
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="メールアドレス"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="パスワード"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />

          {mode === "signin" && (
            <Link
              href="/reset-password"
              className="text-right text-xs font-semibold text-orange-500"
            >
              パスワードをお忘れですか？
            </Link>
          )}

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs text-orange-300"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-14 w-full rounded-xl bg-orange-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting
              ? "処理中..."
              : mode === "signin"
                ? "ログイン"
                : "新規登録"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setMessage(null);
          }}
          className="text-center text-sm text-zinc-400"
        >
          {mode === "signin" ? (
            <>
              アカウントをお持ちでない方は{" "}
              <span className="font-semibold text-orange-500">新規登録</span>
            </>
          ) : (
            <>
              すでにアカウントをお持ちの方は{" "}
              <span className="font-semibold text-orange-500">ログイン</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
