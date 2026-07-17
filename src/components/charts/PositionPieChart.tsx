"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

export function PositionPieChart({
  referee,
  assistant,
  unset,
}: {
  referee: number;
  assistant: number;
  unset: number;
}) {
  const total = referee + assistant + unset || 1;
  const data = [
    { name: "主審", value: referee, fill: "#2dd4bf", fillOpacity: 1 },
    { name: "副審", value: assistant, fill: "#f59e0b", fillOpacity: 1 },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              startAngle={90}
              endAngle={-270}
              cx="50%"
              cy="40%"
              innerRadius="52%"
              outerRadius="72%"
              paddingAngle={0}
              stroke="#0f172a"
              strokeWidth={1}
              label={({ percent }) =>
                percent && percent > 0.06 ? `${Math.round(percent * 100)}%` : ""
              }
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.fill}
                  fillOpacity={entry.fillOpacity}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-1.5 text-xs text-zinc-300">
        {data.map((entry) => (
          <span key={entry.name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.fill, opacity: entry.fillOpacity }}
            />
            {entry.name}（{((entry.value / total) * 100).toFixed(0)}%）
          </span>
        ))}
      </div>
    </div>
  );
}
