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

export function GoalPaceChart({
  monthlyCounts,
  goal,
}: {
  monthlyCounts: { month: number; label: string; count: number }[];
  goal: number;
}) {
  const chartData = monthlyCounts.map((m, index) => ({
    label: m.label,
    "実績（累計）": monthlyCounts
      .slice(0, index + 1)
      .reduce((sum, entry) => sum + entry.count, 0),
    "目標ペース": Math.round((goal * m.month) / 12),
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
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
            tick={{ fill: "#71717a", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <Line
            type="monotone"
            dataKey="目標ペース"
            stroke="#71717a"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="実績（累計）"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f97316", stroke: "#000000", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#f97316", stroke: "#000000", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-zinc-300">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full bg-orange-500" />
          実績（累計）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-zinc-400" />
          目標ペース
        </span>
      </div>
    </div>
  );
}
