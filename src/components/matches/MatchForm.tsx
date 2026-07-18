"use client";

import Link from "next/link";
import { cloneElement, isValidElement, useId, useState, type ReactNode } from "react";
import {
  EMPTY_NEW_MATCH_INPUT,
  type MatchRole,
  type NewMatchInput,
  type RefereePosition,
} from "@/lib/matches";
import { ACTIVITY_CATEGORIES } from "@/lib/profile";
import { KeywordTagInput } from "@/components/matches/KeywordTagInput";
import { PopularKeywordTags } from "@/components/matches/PopularKeywordTags";
import { RatingInput } from "@/components/matches/RatingInput";
import { toggleTag } from "@/lib/keywords";
import { LONG_TEXT_MAX, SHORT_TEXT_MAX, URL_MAX } from "@/lib/inputLimits";
import { isSessionExpiredError } from "@/lib/sessionError";

const REFEREE_POSITIONS: RefereePosition[] = ["主審", "副審"];
const MATCH_ROLES: MatchRole[] = ["トレイル", "リード", "センター"];

type FieldErrors = {
  date?: string;
  competition?: string;
  refereePosition?: string;
};

export type MatchFormProps = {
  initialValues?: NewMatchInput;
  onSubmit: (values: NewMatchInput) => Promise<void> | void;
  isSubmitting: boolean;
  submitError: string | null;
  submitLabel: string;
  submittingLabel: string;
  secondaryAction?: {
    label: string;
    loadingLabel: string;
    isLoading: boolean;
    onClick: () => void;
  };
};

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export const errorInputClass =
  "w-full rounded-xl border border-red-500/60 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";

const FIELD_INPUT_TAGS = new Set(["input", "select", "textarea"]);

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  // Only wire id/aria-invalid/aria-describedby onto the control when
  // `children` is a single native form element (the common case: one
  // <input>/<select>/<textarea> per Field) — fields that render a custom
  // multi-element body (e.g. a button-group selector) fall back to the
  // plain label/error rendering below rather than risk mis-cloning props
  // onto something that doesn't expect them.
  const canAssociate =
    isValidElement(children) && typeof children.type === "string" && FIELD_INPUT_TAGS.has(children.type);

  const control = canAssociate
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })
    : children;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={canAssociate ? fieldId : undefined}
        className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
      >
        {label}
        {required && <span className="ml-1 text-cyan-400">*</span>}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
        {title}
      </p>
      {children}
    </div>
  );
}

export function SelectButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option === value ? ("" as T) : option)}
          className={`h-11 flex-1 rounded-xl border text-sm font-bold transition ${
            value === option
              ? "border-cyan-500 bg-cyan-500 text-black"
              : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function MatchForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel,
  submittingLabel,
  secondaryAction,
}: MatchFormProps) {
  const [values, setValues] = useState<NewMatchInput>(
    initialValues ?? EMPTY_NEW_MATCH_INPUT,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const update = <K extends keyof NewMatchInput>(
    key: K,
    value: NewMatchInput[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!values.date) errors.date = "試合日を入力してください";
    if (!values.competition.trim()) errors.competition = "大会名を入力してください";
    if (!values.refereePosition) errors.refereePosition = "担当ポジションを選択してください";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;
    // validate() only checks competition.trim() for the required-field
    // rule; without also trimming the saved value here, "  高校総体  "
    // passes validation (not empty after trim) but is persisted with the
    // surrounding whitespace intact, which then affects search matching
    // and display everywhere the record is shown.
    await onSubmit({ ...values, competition: values.competition.trim() });
  };

  return (
    <form
      id="match-form"
      onSubmit={handleSubmit}
      className="relative flex-1 space-y-6 px-4 pb-44 pt-6"
    >
      <SectionCard title="基本情報">
        <div className="grid grid-cols-2 gap-4">
          <Field label="試合日" required error={fieldErrors.date}>
            <input
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
              className={fieldErrors.date ? errorInputClass : inputClass}
            />
          </Field>
          <Field label="試合開始時間">
            <input
              type="time"
              value={values.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="大会名" required error={fieldErrors.competition}>
          <input
            type="text"
            value={values.competition}
            onChange={(e) => update("competition", e.target.value)}
            placeholder="例: 春季リーグ戦"
            maxLength={SHORT_TEXT_MAX}
            className={fieldErrors.competition ? errorInputClass : inputClass}
          />
        </Field>

        <Field label="カテゴリー">
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => update("category", category)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  values.category === category
                    ? "border-cyan-500 bg-cyan-500 text-black"
                    : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={values.category}
            onChange={(e) => update("category", e.target.value)}
            placeholder="例: U15男子 / 社会人リーグ"
            maxLength={SHORT_TEXT_MAX}
            className={inputClass}
          />
        </Field>

        <Field label="会場">
          <input
            type="text"
            value={values.venue}
            onChange={(e) => update("venue", e.target.value)}
            placeholder="例: ○○体育館"
            maxLength={SHORT_TEXT_MAX}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="ホームチーム名">
            <input
              type="text"
              value={values.homeTeam}
              onChange={(e) => update("homeTeam", e.target.value)}
              placeholder="例: ○○高校"
              maxLength={SHORT_TEXT_MAX}
              className={inputClass}
            />
          </Field>
          <Field label="アウェーチーム名">
            <input
              type="text"
              value={values.awayTeam}
              onChange={(e) => update("awayTeam", e.target.value)}
              placeholder="例: △△高校"
              maxLength={SHORT_TEXT_MAX}
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="担当ポジション"
          required
          error={fieldErrors.refereePosition}
        >
          <SelectButtons
            options={REFEREE_POSITIONS}
            value={values.refereePosition}
            onChange={(v) => update("refereePosition", v)}
          />
        </Field>

        <Field label="試合での役割">
          <SelectButtons
            options={MATCH_ROLES}
            value={values.matchRole}
            onChange={(v) => update("matchRole", v)}
          />
        </Field>
      </SectionCard>

      <SectionCard title="自己評価">
        <RatingInput
          label="判定"
          value={values.judgmentRating}
          onChange={(v) => update("judgmentRating", v)}
        />
        <RatingInput
          label="メカニクス"
          value={values.mechanicsRating}
          onChange={(v) => update("mechanicsRating", v)}
        />
        <RatingInput
          label="ポジショニング"
          value={values.positionRating}
          onChange={(v) => update("positionRating", v)}
        />
        <RatingInput
          label="ゲームコントロール"
          value={values.gameControlRating}
          onChange={(v) => update("gameControlRating", v)}
        />
        <RatingInput
          label="コミュニケーション"
          value={values.communicationRating}
          onChange={(v) => update("communicationRating", v)}
        />
        <RatingInput
          label="走力"
          value={values.staminaRating}
          onChange={(v) => update("staminaRating", v)}
        />
      </SectionCard>

      <SectionCard title="振り返り">
        <Field label="良かったこと">
          <textarea
            value={values.goodPoints}
            onChange={(e) => update("goodPoints", e.target.value)}
            rows={3}
            placeholder="今日の試合で上手くいったことを記録しましょう"
            maxLength={LONG_TEXT_MAX}
            className={inputClass}
          />
        </Field>
        <Field label="改善したいこと">
          <textarea
            value={values.improvements}
            onChange={(e) => update("improvements", e.target.value)}
            rows={3}
            placeholder="次に活かしたい課題を記録しましょう"
            maxLength={LONG_TEXT_MAX}
            className={inputClass}
          />
        </Field>
        <Field label="次回意識すること">
          <textarea
            value={values.nextGoal}
            onChange={(e) => update("nextGoal", e.target.value)}
            rows={3}
            placeholder="次の試合で意識したいことを書きましょう"
            maxLength={LONG_TEXT_MAX}
            className={inputClass}
          />
        </Field>
      </SectionCard>

      <SectionCard title="キーワード">
        <PopularKeywordTags
          value={values.keywords}
          onSelect={(tag) => update("keywords", toggleTag(values.keywords, tag))}
        />
        <KeywordTagInput
          value={values.keywords}
          onChange={(tags) => update("keywords", tags)}
        />
      </SectionCard>

      <SectionCard title="関連資料">
        <Field label="試合動画URL">
          <input
            type="url"
            value={values.videoUrl}
            onChange={(e) => update("videoUrl", e.target.value)}
            placeholder="https://..."
            maxLength={URL_MAX}
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-zinc-400">
          写真アップロードは今後のバージョンで対応予定です。
        </p>
      </SectionCard>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#07131f] via-[#07131f] to-transparent px-4 pb-6 pt-8">
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
          >
            {isSessionExpiredError(submitError) ? (
              <>
                <p className="font-semibold">
                  ログインの有効期限が切れました
                </p>
                <p className="mt-1 leading-relaxed">
                  入力内容はこの画面に残っています。別のタブでログインし直してから、もう一度保存してください。
                </p>
                <Link
                  href="/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-semibold text-red-300 underline underline-offset-2"
                >
                  ログイン画面を開く
                </Link>
              </>
            ) : (
              <p>{submitError}</p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <button
            type="submit"
            form="match-form"
            disabled={isSubmitting}
            className="h-14 w-full rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={isSubmitting || secondaryAction.isLoading}
              className="h-12 w-full rounded-xl border border-red-500/40 bg-red-500/10 text-sm font-semibold tracking-wide text-red-400 transition active:scale-[0.98] active:bg-red-500/20 disabled:opacity-60"
            >
              {secondaryAction.isLoading
                ? secondaryAction.loadingLabel
                : secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
