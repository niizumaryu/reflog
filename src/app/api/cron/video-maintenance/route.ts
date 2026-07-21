import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIdentifier } from "@/lib/rateLimit";
import { runOriginalVideoPurge, runOrphanUploadCleanup } from "@/lib/video-analysis/videoMaintenance";
import { buildOrphanCleanupDeps, buildPurgeDeps } from "@/lib/video-analysis/videoMaintenanceDeps";

// Storage housekeeping for the video-analysis feature: (1) deletes
// original video files once a completed analysis has passed its plan's
// retention_days, and (2) deletes Storage objects with no matching
// video_analyses row (an upload whose browser tab closed before the
// follow-up DB insert ran).
//
// NOT wired into vercel.json — unlike /api/cron/notifications, this
// route performs irreversible deletions of user-uploaded video files, so
// turning on automatic scheduled execution is left as a deliberate,
// documented operator decision (see docs/video-retention-ops.md) rather
// than something this change enables by default. Calling this route
// today, even with a valid CRON_SECRET, does nothing destructive unless
// the caller explicitly passes `?dryRun=false`.
//
// See src/lib/video-analysis/retention.ts and orphanUploads.ts for the
// pure eligibility rules, and videoMaintenance.ts for how they're
// sequenced against Storage/DB calls.

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function handle(request: NextRequest) {
  // Fail-closed, same rule as /api/cron/notifications: an unset
  // CRON_SECRET must reject every call, never skip the check. This
  // route uses the service-role client and can delete any user's video
  // files, so "secret merely unconfigured" must behave identically to
  // "no valid secret provided".
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !authHeader || !timingSafeEqualString(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`cron-video-maintenance:${clientIdentifier(request)}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  // Safe by default: a bare authenticated call only reports what WOULD
  // happen. Actual deletion requires the caller to opt in explicitly.
  const dryRun = url.searchParams.get("dryRun") !== "false";
  const action = url.searchParams.get("action") ?? "both";

  const admin = createAdminClient();
  const result: { dryRun: boolean; purge?: unknown; orphans?: unknown } = { dryRun };

  try {
    if (action === "purge" || action === "both") {
      result.purge = await runOriginalVideoPurge(buildPurgeDeps(admin), { dryRun });
    }
    if (action === "orphans" || action === "both") {
      result.orphans = await runOrphanUploadCleanup(buildOrphanCleanupDeps(admin), { dryRun });
    }
  } catch (error) {
    console.error("[cron/video-maintenance] failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "internal error" },
      { status: 500 },
    );
  }

  const hasErrors =
    (result.purge && (result.purge as { errors: string[] }).errors.length > 0) ||
    (result.orphans && (result.orphans as { errors: string[] }).errors.length > 0);
  if (hasErrors) {
    console.error("[cron/video-maintenance] completed with errors:", result);
    return NextResponse.json({ success: false, ...result }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...result });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
