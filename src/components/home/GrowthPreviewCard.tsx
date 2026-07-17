import Link from "next/link";
import { MonthlyMatchesBarChart } from "@/components/charts/MonthlyMatchesBarChart";
import { getRollingMonthlyBuckets } from "@/lib/coach";
import { getOverallAverage, type MatchRecord } from "@/lib/matches";

// Small preview of the growth trend on the home dashboard. The full,
// period-switchable chart set lives on /growth/charts — this just shows
// enough to invite a tap-through without duplicating that page's controls.
export default function GrowthPreviewCard({ matches }: { matches: MatchRecord[] }) {
  const buckets = getRollingMonthlyBuckets(matches, "6m", getOverallAverage);
  const chartData = buckets.map((bucket, index) => ({
    month: index + 1,
    label: bucket.label,
    count: bucket.count,
    hasRecord: bucket.count > 0,
  }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          📈 成長グラフ(直近6か月)
        </p>
        <Link href="/growth/charts" className="text-xs font-semibold text-cyan-400">
          詳しく見る →
        </Link>
      </div>
      <MonthlyMatchesBarChart data={chartData} />
    </div>
  );
}
