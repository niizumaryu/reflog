type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  unit?: string;
};

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-zinc-400">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-zinc-400">{item.name}</span>
            <span className="ml-auto font-bold text-white">
              {item.value}
              {item.unit ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
