"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

export type CumulativeDatum = { label: string; count: number };

export function CumulativeMatchesChart({ data }: { data: CumulativeDatum[] }) {
  const chartData = data.reduce<{ label: string; "累計試合数": number }[]>((acc, d) => {
    const previous = acc.length > 0 ? acc[acc.length - 1]["累計試合数"] : 0;
    acc.push({ label: d.label, "累計試合数": previous + d.count });
    return acc;
  }, []);

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 9 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
          <Line
            type="monotone"
            dataKey="累計試合数"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "#22d3ee", stroke: "#000000", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
