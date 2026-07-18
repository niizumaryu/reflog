"use client";

// recharts is a sizeable dependency. These pages (home, report, growth
// charts) always render several chart components together, so importing
// them via next/dynamic keeps recharts out of the route's initial JS chunk
// and loads it as a separate chunk once the page mounts. A fixed-height
// skeleton (matching each chart's own wrapper height) is shown while that
// chunk loads, so there's no layout shift once the real chart appears.
import dynamic from "next/dynamic";

function ChartSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <div className={`${heightClass} w-full animate-pulse rounded-xl bg-white/5`} />
  );
}

export const MonthlyMatchesBarChart = dynamic(
  () =>
    import("@/components/charts/MonthlyMatchesBarChart").then(
      (mod) => mod.MonthlyMatchesBarChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-40" /> },
);

export const MonthlyRatingLineChart = dynamic(
  () =>
    import("@/components/charts/MonthlyRatingLineChart").then(
      (mod) => mod.MonthlyRatingLineChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-40" /> },
);

export const PositionPieChart = dynamic(
  () =>
    import("@/components/charts/PositionPieChart").then(
      (mod) => mod.PositionPieChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-64" /> },
);

export const GoalPaceChart = dynamic(
  () => import("@/components/charts/GoalPaceChart").then((mod) => mod.GoalPaceChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-52" /> },
);

export const YearComparisonBarChart = dynamic(
  () =>
    import("@/components/charts/YearComparisonBarChart").then(
      (mod) => mod.YearComparisonBarChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-36" /> },
);

export const CumulativeMatchesChart = dynamic(
  () =>
    import("@/components/charts/CumulativeMatchesChart").then(
      (mod) => mod.CumulativeMatchesChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-40" /> },
);

export const EntryTypePieChart = dynamic(
  () =>
    import("@/components/charts/EntryTypePieChart").then(
      (mod) => mod.EntryTypePieChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-64" /> },
);

export const KeywordTrendChart = dynamic(
  () =>
    import("@/components/charts/KeywordTrendChart").then(
      (mod) => mod.KeywordTrendChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-40" /> },
);
