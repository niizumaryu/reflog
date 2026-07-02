"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { queueToast } from "@/components/Toast";
import {
  ACTIVITY_CATEGORIES,
  getProfile,
  PREFECTURES,
  updateProfile,
  type Profile,
} from "@/lib/profile";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

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

const EMPTY_PROFILE: Profile = {
  name: "",
  prefecture: "",
  refereeGrade: "",
  categories: [],
  yearsOfExperience: null,
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch((loadError: unknown) => {
        console.error("Failed to load profile:", loadError);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const toggleCategory = (category: string) => {
    setProfile((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateProfile(profile);
    } catch (saveError) {
      setIsSaving(false);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存に失敗しました。もう一度お試しください。",
      );
      return;
    }
    queueToast("プロフィールを保存しました");
    router.push("/settings");
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/settings"
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
            Profile
          </p>
          <h1 className="text-lg font-bold tracking-tight">プロフィール編集</h1>
        </div>
      </header>

      {isLoading ? null : (
        <form
          id="profile-form"
          onSubmit={handleSubmit}
          className="relative flex-1 space-y-8 px-4 pb-32 pt-6"
        >
          <Field label="名前">
            <input
              type="text"
              placeholder="例: 山田 太郎"
              value={profile.name}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, name: event.target.value }))
              }
              className={inputClass}
            />
          </Field>

          <Field label="都道府県">
            <select
              value={profile.prefecture}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  prefecture: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </Field>

          <Field label="審判級">
            <input
              type="text"
              placeholder="例: 県2級"
              value={profile.refereeGrade}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  refereeGrade: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>

          <Field label="活動カテゴリー">
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_CATEGORIES.map((category) => {
                const selected = profile.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      selected
                        ? "border-orange-500 bg-orange-500 text-black"
                        : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="審判歴（年）">
            <input
              type="number"
              min={0}
              placeholder="例: 5"
              value={profile.yearsOfExperience ?? ""}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  yearsOfExperience:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
        </form>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-black via-black to-transparent px-4 pb-6 pt-8">
        {error && (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          form="profile-form"
          disabled={isSaving || isLoading}
          className="h-14 w-full rounded-xl bg-orange-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {isSaving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
