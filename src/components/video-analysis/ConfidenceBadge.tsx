export type ConfidenceLevel =
  | "insufficient"
  | "low"
  | "medium"
  | "high"
  | "not_applicable"
  | "demo_only";

const LEVEL_STYLES: Record<ConfidenceLevel, { label: string; className: string }> = {
  insufficient: { label: "判定不能", className: "border-red-500/40 bg-red-500/10 text-red-300" },
  low: { label: "信頼度: 低", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  medium: {
    label: "信頼度: 中",
    className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  },
  high: { label: "信頼度: 高", className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
  not_applicable: {
    label: "検出未実施",
    className: "border-white/15 bg-white/5 text-zinc-400",
  },
  demo_only: { label: "デモ結果", className: "border-white/15 bg-white/5 text-zinc-400" },
};

export function ConfidenceBadge({
  level,
  label,
}: {
  level: ConfidenceLevel;
  label?: string;
}) {
  const style = LEVEL_STYLES[level];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.className}`}
    >
      {label ?? style.label}
    </span>
  );
}
