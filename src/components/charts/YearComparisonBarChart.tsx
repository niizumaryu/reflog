"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

export function YearComparisonBarChart({
  metricLabel,
  prevYear,
  prevValue,
  currentYear,
  currentValue,
  formatValue,
}: {
  metricLabel: string;
  prevYear: number;
  prevValue: number;
  currentYear: number;
  currentValue: number;
  formatValue?: (value: number) => string;
}) {
  const format = formatValue ?? ((v: number) => `${v}`);
  const data = [
    {
      label: `${prevYear}年`,
      [metricLabel]: prevValue,
      display: format(prevValue),
    },
    {
      label: `${currentYear}年`,
      [metricLabel]: currentValue,
      display: format(currentValue),
    },
  ];

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
          />
          <Bar dataKey={metricLabel} radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill="#f97316"
                fillOpacity={index === data.length - 1 ? 1 : 0.4}
              />
            ))}
            <LabelList dataKey="display" position="top" fill="#e4e4e7" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
