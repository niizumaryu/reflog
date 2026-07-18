"use client";

import { useId } from "react";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export function RatingInput({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex gap-2">
        {RATING_VALUES.map((n) => {
          const selected = n === value;
          if (readOnly) {
            return (
              <div
                key={n}
                className={`flex h-9 w-9 flex-1 items-center justify-center rounded-full border text-sm font-bold ${
                  selected
                    ? "border-cyan-500 bg-cyan-500 text-black"
                    : "border-white/10 bg-white/5 text-zinc-400"
                }`}
              >
                {n}
              </div>
            );
          }
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange?.(n === value ? 0 : n)}
              aria-pressed={selected}
              className={`flex h-11 w-11 flex-1 items-center justify-center rounded-full border text-sm font-bold transition ${
                selected
                  ? "border-cyan-500 bg-cyan-500 text-black"
                  : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
