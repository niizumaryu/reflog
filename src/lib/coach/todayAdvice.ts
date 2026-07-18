import { jstDateString } from "@/lib/date";
import { sortByNewest, type MatchRecord } from "@/lib/matches";
import type { ScheduleLike, TodayAdvice } from "@/lib/coach/types";

function truncate(text: string, max = 32): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function daysSince(referenceDate: Date, isoDate: string): number | null {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.round((referenceDate.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

// Priority order (highest first): a match tomorrow, a match today, a very
// recent save, an unfinished Quick Log, prolonged inactivity, then the
// empty state. Only one is shown at a time so this never competes for
// attention with the 今日のREFLOG card, which covers "what's next" rather
// than "what should I think about."
export function generateTodayAdvice(
  matches: MatchRecord[],
  schedules: ScheduleLike[],
  referenceDate: Date = new Date(),
): TodayAdvice {
  if (matches.length === 0) {
    return {
      kind: "empty",
      title: "REFLOGへようこそ",
      message: "最初の試合を記録すると、ここにAIコーチからのアドバイスが表示されます。",
      primaryAction: { label: "30秒で記録する", href: "/matches/quick" },
    };
  }

  const today = jstDateString(referenceDate);
  const tomorrow = jstDateString(new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000));
  const hasScheduleOn = (isoDate: string) =>
    schedules.some((s) => s.scheduled_date === isoDate);

  const newest = sortByNewest(matches);
  const latest = newest[0];

  if (hasScheduleOn(tomorrow)) {
    const focusText = latest.nextGoal || latest.improvements;
    return {
      kind: "before_match_tomorrow",
      title: "明日は試合です",
      message: focusText
        ? `前回の記録から「${truncate(focusText)}」を意識して臨みましょう。`
        : "前回の記録を見返して、意識したいポイントを1つ決めておきましょう。",
      supportingNote: focusText ? "前回の記録より" : undefined,
      primaryAction: { label: "前回の記録を見る", href: `/matches/${latest.id}` },
    };
  }

  if (hasScheduleOn(today)) {
    return {
      kind: "match_today",
      title: "今日は試合です",
      message: "試合前に一呼吸おいて、いつも通りの基準で臨みましょう。終わったら忘れないうちに記録を。",
      primaryAction: { label: "30秒で記録する", href: "/matches/quick" },
    };
  }

  const daysSinceLatest = daysSince(referenceDate, latest.date || latest.createdAt);

  if (daysSinceLatest !== null && daysSinceLatest <= 2) {
    const theme = latest.nextGoal || latest.improvements;
    return {
      kind: "recent_save",
      title: "記録お疲れさまでした",
      message: theme
        ? `今回意識した「${truncate(theme)}」を次の試合でも引き続き意識してみましょう。`
        : "今回の記録を振り返り、次の試合に向けたテーマを1つ決めてみましょう。",
      primaryAction: { label: "詳しく見る", href: `/matches/${latest.id}` },
    };
  }

  if (latest.entryType === "quick") {
    return {
      kind: "quick_log_pending",
      title: "詳細記録を追加しませんか",
      message: "前回はQuick Log(30秒記録)でした。時間があるときに詳細を追記すると、AIコーチの分析がより具体的になります。",
      primaryAction: { label: "詳細を追加する", href: `/matches/${latest.id}/edit` },
    };
  }

  if (daysSinceLatest !== null && daysSinceLatest >= 14) {
    return {
      kind: "inactive",
      title: "しばらく記録がありません",
      message: `最後の記録から${daysSinceLatest}日が経っています。過去の記録を振り返って、次の試合に備えましょう。`,
      primaryAction: { label: "過去の記録を見る", href: "/matches" },
    };
  }

  return {
    kind: "recent_save",
    title: "今日のアドバイス",
    message: "前回の記録を見返して、次の試合で意識したいことを1つ決めておきましょう。",
    primaryAction: { label: "前回の記録を見る", href: `/matches/${latest.id}` },
  };
}
