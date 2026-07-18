"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatScheduleTime, type ScheduleRecord } from "@/lib/schedules";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  return Array.from({ length: 42 }, (_, i) =>
    new Date(year, month, 1 - startWeekday + i),
  );
}

export function MonthlyCalendar({ schedules }: { schedules: ScheduleRecord[] }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ScheduleRecord[]>();
    for (const schedule of schedules) {
      if (!schedule.date) continue;
      const list = map.get(schedule.date) ?? [];
      list.push(schedule);
      map.set(schedule.date, list);
    }
    return map;
  }, [schedules]);

  const gridDays = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const selectedSchedules = schedulesByDate.get(selectedDate) ?? [];

  const goToMonth = (offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "ja-JP",
    { month: "long", day: "numeric", weekday: "short" },
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="前月"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
        >
          ‹
        </button>
        <p className="text-base font-bold tracking-wide">
          {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
        </p>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="翌月"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
        >
          ›
        </button>
      </div>

      <button
        type="button"
        onClick={goToday}
        className="mt-2 w-full rounded-lg border border-cyan-500/40 py-1.5 text-xs font-bold text-cyan-400 transition active:bg-cyan-500/10"
      >
        今日へ戻る
      </button>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <p
            key={label}
            className={`text-[11px] font-semibold ${
              i === 0 ? "text-red-400/80" : i === 6 ? "text-cyan-400/80" : "text-zinc-400"
            }`}
          >
            {label}
          </p>
        ))}

        {gridDays.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === viewDate.getMonth();
          const hasSchedules = schedulesByDate.has(key);
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition ${
                isSelected
                  ? "border-cyan-400 bg-cyan-500/20 text-white"
                  : isToday
                    ? "border-cyan-500/50 text-white"
                    : "border-transparent text-white active:bg-white/10"
              } ${inMonth ? "" : "opacity-30"}`}
            >
              <span className="text-[13px] font-semibold">{day.getDate()}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasSchedules ? "bg-cyan-400" : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {selectedLabel}の予定
        </p>
        {selectedSchedules.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
            予定はありません
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedSchedules.map((schedule) => (
              <li key={schedule.id}>
                <Link
                  href={`/schedule/${schedule.id}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition active:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-white">
                      {schedule.title || "予定名未設定"}
                    </span>
                    {schedule.time && (
                      <span className="shrink-0 text-xs font-bold text-cyan-400">
                        {formatScheduleTime(schedule.time)}
                      </span>
                    )}
                  </div>
                  {schedule.place && (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {schedule.place}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
