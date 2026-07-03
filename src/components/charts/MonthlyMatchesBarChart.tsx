"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

export type MonthlyMatchDatum = {
  month: number;
  label: string;
  count: number;
  hasRecord: boolean;
};

export function MonthlyMatchesBarChart({
  data,
}: {
  data: MonthlyMatchDatum[];
}) {
  const chartData = data.map((d) => ({
    label: d.label,
    "試合数": d.count,
    displayValue: d.hasRecord ? d.count : null,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 9 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
          />
          <Bar
            dataKey="試合数"
            fill="#f97316"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          >
            <LabelList
              dataKey="displayValue"
              position="top"
              fill="#a1a1aa"
              fontSize={9}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
