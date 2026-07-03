"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

export type MonthlyRatingDatum = {
  month: number;
  label: string;
  average: number | null;
};

export function MonthlyRatingLineChart({
  data,
}: {
  data: MonthlyRatingDatum[];
}) {
  const chartData = data.map((d) => ({
    label: d.label,
    "自己評価": d.average,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 9 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fill: "#71717a", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={20}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <Line
            type="monotone"
            dataKey="自己評価"
            stroke="#f97316"
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 4, fill: "#f97316", stroke: "#000000", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#f97316", stroke: "#000000", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
