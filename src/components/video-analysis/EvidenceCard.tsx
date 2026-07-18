import { TimestampLink } from "@/components/video-analysis/TimestampLink";
import { UncertaintyCard } from "@/components/video-analysis/UncertaintyCard";
import { EVENT_TYPE_LABELS, STAGE_LABELS } from "@/lib/video-analysis/constants";
import type { AnalysisEvent } from "@/lib/video-analysis/types";

export function EvidenceCard({
  event,
  onSeek,
}: {
  event: AnalysisEvent;
  onSeek?: (seconds: number) => void;
}) {
  const title = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;
  const stageLabel = STAGE_LABELS[event.stage] ?? event.stage;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {stageLabel}
        </p>
        {event.timestampSeconds !== null && onSeek && (
          <TimestampLink seconds={event.timestampSeconds} onSeek={onSeek} />
        )}
      </div>
      <UncertaintyCard title={title} fields={event} />
    </div>
  );
}
