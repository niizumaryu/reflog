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
    { name: "主審", value: referee, fill: "#f97316", fillOpacity: 1 },
    { name: "副審", value: assistant, fill: "#f97316", fillOpacity: 0.55 },
    { name: "未設定", value: unset, fill: "#ffffff", fillOpacity: 0.18 },
  ];

  return (
    <div className="space-y-3">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 3 : 0}
              stroke="#000000"
              strokeWidth={2}
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
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-zinc-300">
        {data.map((entry) => (
          <span key={entry.name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.fill, opacity: entry.fillOpacity }}
            />
            {entry.name} {entry.value}件（{((entry.value / total) * 100).toFixed(0)}%）
          </span>
        ))}
      </div>
    </div>
  );
}
