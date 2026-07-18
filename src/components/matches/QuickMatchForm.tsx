"use client";

import Link from "next/link";
import { useState } from "react";
import {
  EMPTY_NEW_MATCH_INPUT,
  RATING_FIELDS,
  type NewMatchInput,
  type RefereePosition,
} from "@/lib/matches";
import { toggleTag } from "@/lib/keywords";
import { isSessionExpiredError } from "@/lib/sessionError";
import {
  errorInputClass,
  Field,
  inputClass,
  SectionCard,
  SelectButtons,
} from "@/components/matches/MatchForm";
import { KeywordTagInput } from "@/components/matches/KeywordTagInput";
import { PopularKeywordTags } from "@/components/matches/PopularKeywordTags";
import { RatingInput } from "@/components/matches/RatingInput";
import { LONG_TEXT_MAX, SHORT_TEXT_MAX } from "@/lib/inputLimits";

const REFEREE_POSITIONS: RefereePosition[] = ["主審", "副審"];

type QuickFieldErrors = {
  date?: string;
  competition?: string;
  refereePosition?: string;
  overallRating?: string;
};

export type QuickMatchFormProps = {
  onSubmit: (values: NewMatchInput) => Promise<void> | void;
  isSubmitting: boolean;
  submitError: string | null;
  submitLabel: string;
  submittingLabel: string;
};

// Every value the detailed form asks for but Quick Log doesn't collect stays
// at the same safe defaults MatchForm uses, so records saved here round-trip
// through the normal matches list/report/AI features without special-casing.
const QUICK_LOG_BASE: NewMatchInput = {
  ...EMPTY_NEW_MATCH_INPUT,
  entryType: "quick",
};

export function QuickMatchForm({
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel,
  submittingLabel,
}: QuickMatchFormProps) {
  const [date, setDate] = useState("");
  const [competition, setCompetition] = useState("");
  const [refereePosition, setRefereePosition] = useState<RefereePosition>("");
  const [overallRating, setOverallRating] = useState(0);
  const [goodPoints, setGoodPoints] = useState("");
  const [improvements, setImprovements] = useState("");
  const [nextGoal, setNextGoal] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<QuickFieldErrors>({});

  const validate = (): boolean => {
    const errors: QuickFieldErrors = {};
    if (!date) errors.date = "試合日を入力してください";
    if (!competition.trim()) errors.competition = "大会名を入力してください";
    if (!refereePosition) errors.refereePosition = "担当ポジションを選択してください";
    if (!overallRating) errors.overallRating = "総合自己評価を選択してください";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    const ratingFields = Object.fromEntries(
      RATING_FIELDS.map((field) => [field, overallRating]),
    ) as Pick<NewMatchInput, (typeof RATING_FIELDS)[number]>;

    const values: NewMatchInput = {
      ...QUICK_LOG_BASE,
      date,
      // validate() only checks competition.trim() for the required-field
      // rule; trim the saved value too, or "  高校総体  " would pass
      // validation but persist with the surrounding whitespace intact.
      competition: competition.trim(),
      refereePosition,
      ...ratingFields,
      goodPoints,
      improvements,
      nextGoal,
      keywords,
    };
    await onSubmit(values);
  };

  return (
    <form
      id="quick-match-form"
      onSubmit={handleSubmit}
      className="relative flex-1 space-y-6 px-4 pb-40 pt-6"
    >
      <SectionCard title="基本情報">
        <Field label="試合日" required error={fieldErrors.date}>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setFieldErrors((prev) => ({ ...prev, date: undefined }));
            }}
            className={fieldErrors.date ? errorInputClass : inputClass}
          />
        </Field>

        <Field label="大会名" required error={fieldErrors.competition}>
          <input
            type="text"
            value={competition}
            onChange={(e) => {
              setCompetition(e.target.value);
              setFieldErrors((prev) => ({ ...prev, competition: undefined }));
            }}
            placeholder="例: 春季リーグ戦"
            maxLength={SHORT_TEXT_MAX}
            className={fieldErrors.competition ? errorInputClass : inputClass}
          />
        </Field>

        <Field
          label="担当ポジション"
          required
          error={fieldErrors.refereePosition}
        >
          <SelectButtons
            options={REFEREE_POSITIONS}
            value={refereePosition}
            onChange={(v) => {
              setRefereePosition(v);
              setFieldErrors((prev) => ({ ...prev, refereePosition: undefined }));
            }}
          />
        </Field>
      </SectionCard>

      <SectionCard title="自己評価">
        <Field
          label="総合自己評価"
          required
          error={fieldErrors.overallRating}
        >
          <RatingInput
            label="1(改善したい) 〜 5(良かった)"
            value={overallRating}
            onChange={(v) => {
              setOverallRating(v);
              setFieldErrors((prev) => ({ ...prev, overallRating: undefined }));
            }}
          />
        </Field>
      </SectionCard>

      <SectionCard title="振り返り(任意)">
        <Field label="良かったこと">
          <textarea
            value={goodPoints}
            onChange={(e) => setGoodPoints(e.target.value)}
            rows={2}
            placeholder="今日の試合で上手くいったことを記録しましょう"
            maxLength={LONG_TEXT_MAX}
            className={inputClass}
          />
        </Field>
        <Field label="改善したいこと">
          <textarea
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            rows={2}
            placeholder="次に活かしたい課題を記録しましょう"
            maxLength={LONG_TEXT_MAX}
            className={inputClass}
          />
        </Field>
        <Field label="次回意識すること">
          <textarea
            value={nextGoal}
            onChange={(e) => setNextGoal(e.target.value)}
            rows={2}
            placeholder="次の試合で意識したいことを書きましょう"
            maxLength={LONG_TEXT_MAX}
            className={inputClass}
          />
        </Field>
      </SectionCard>

      <SectionCard title="キーワード(任意)">
        <PopularKeywordTags
          value={keywords}
          onSelect={(tag) => setKeywords((prev) => toggleTag(prev, tag))}
        />
        <KeywordTagInput value={keywords} onChange={setKeywords} />
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
        <button
          type="submit"
          form="quick-match-form"
          disabled={isSubmitting}
          className="h-14 w-full rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
