import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/client";
import { PLAN_LABELS } from "@/lib/video-analysis/constants";
import type { PlanLimit, PlanType, UsageSummary } from "@/lib/video-analysis/types";

// Display-only usage math. The actual limit is enforced server-side by
// the enforce_video_analysis_quota trigger on video_analyses (see
// supabase/migrations/20260717_harden_video_analysis.sql) — this module
// only computes what to *show* the user, using the same month-rollover
// rule the trigger uses, so the UI and the enforcement never disagree
// about which "month" a given count belongs to.

function normalizePlanType(value: string): PlanType {
  return value === "pro" || value === "admin" ? value : "free";
}

// Both dates are Postgres `date` values serialized as 'YYYY-MM-DD' by
// supabase-js — comparing the 'YYYY-MM' prefix avoids any Date/timezone
// parsing pitfalls entirely.
function isSameMonth(periodStart: string, referenceIso: string): boolean {
  return periodStart.slice(0, 7) === referenceIso.slice(0, 7);
}

function firstOfNextMonthIso(now: Date): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  return nextMonth.toISOString().slice(0, 10);
}

export function computeUsageSummary(params: {
  planType: string;
  storedCount: number;
  periodStart: string;
  planLimits: PlanLimit[];
  now?: Date;
}): UsageSummary {
  const now = params.now ?? new Date();
  const planType = normalizePlanType(params.planType);
  const nowIso = now.toISOString().slice(0, 10);

  const matchedLimit = params.planLimits.find((p) => p.planType === planType);
  // Defensive fallback only — every real plan_type is always seeded in
  // plan_limits, so this should never trigger in practice. Fails closed
  // (limit 0) rather than open, matching the DB trigger's own behavior
  // when it can't find a plan_limits row.
  const limit = matchedLimit ? matchedLimit.monthlyAnalysisLimit : 0;
  const planLabel = matchedLimit?.label || PLAN_LABELS[planType] || planType;

  const usedThisMonth = isSameMonth(params.periodStart, nowIso) ? params.storedCount : 0;
  const remaining = limit === null ? null : Math.max(limit - usedThisMonth, 0);
  const canStartAnalysis = limit === null || usedThisMonth < limit;

  return {
    planType,
    planLabel,
    used: usedThisMonth,
    limit,
    remaining,
    canStartAnalysis,
    resetsOn: firstOfNextMonthIso(now),
  };
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const [{ data: profile, error: profileError }, { data: limitsData, error: limitsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("plan_type, monthly_video_analysis_count, monthly_video_analysis_period_start")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("plan_limits").select("plan_type, monthly_analysis_limit, label"),
    ]);

  if (profileError) throw profileError;
  if (limitsError) throw limitsError;
  if (!profile) throw new Error("プロフィールが見つかりません");

  const planLimits: PlanLimit[] = (limitsData ?? []).map((row) => ({
    planType: normalizePlanType(row.plan_type),
    monthlyAnalysisLimit: row.monthly_analysis_limit,
    label: row.label,
  }));

  return computeUsageSummary({
    planType: profile.plan_type,
    storedCount: profile.monthly_video_analysis_count,
    periodStart: profile.monthly_video_analysis_period_start,
    planLimits,
  });
}

// The enforce_video_analysis_quota DB trigger raises a plain Postgres
// exception prefixed with "quota_exceeded:" when the monthly limit is
// reached (see the migration above). Supabase surfaces that text
// verbatim as error.message, so this just checks for the marker —
// nothing internal is parsed or trusted beyond "was this the quota
// error or something else".
export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("quota_exceeded");
}
