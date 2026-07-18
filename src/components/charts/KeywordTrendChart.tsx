"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { KeywordTrendPoint } from "@/lib/coach";

export function KeywordTrendChart({
  keyword,
  data,
}: {
  keyword: string | null;
  data: KeywordTrendPoint[];
}) {
  if (!keyword || data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400">
        改善点の記録が増えると表示されます
      </p>
    );
  }

  const chartData = data.map((d) => ({
    label: d.label,
    [keyword]: d.count,
    displayValue: d.count > 0 ? d.count : null,
  }));

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-400">
        最頻出の改善キーワード「<span className="font-semibold text-orange-400">{keyword}</span>」の月別出現数
      </p>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#71717a", fontSize: 9 }}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
            <Bar dataKey={keyword} fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={22}>
              <LabelList dataKey="displayValue" position="top" fill="#a1a1aa" fontSize={9} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
