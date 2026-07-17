import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STALE_ANALYSIS_TIMEOUT_MS } from "@/lib/video-analysis/constants";
import { PipelineError, runAnalysisPipeline } from "@/lib/video-analysis/pipeline";
import type { AnalysisStatus } from "@/lib/video-analysis/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STALE_TIMEOUT_MESSAGE =
  "解析が一定時間応答しなかったため停止しました。もう一度お試しください。";

// Runs the demo/mock analysis pipeline for one video. Uses the normal
// SSR client (not the service-role admin client) — RLS already scopes
// every read/write to the authenticated owner, so no privilege
// escalation is needed here, unlike src/app/api/account/delete.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "不正なIDです" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: analysis, error: fetchError } = await supabase
    .from("video_analyses")
    .select("id, status, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!analysis) {
    return NextResponse.json({ error: "解析対象の動画が見つかりません" }, { status: 404 });
  }

  let currentStatus = analysis.status as AnalysisStatus;

  // A video stuck in 'analyzing' with no recent updated_at means the
  // pipeline run that owned it died without reaching its own failure
  // handler (e.g. a platform timeout). Atomically flip it to 'failed'
  // ONLY if it's still 'analyzing' AND still stale at the moment of this
  // UPDATE — the .eq/.lt filters make this a single atomic statement, so
  // a genuinely in-flight request racing this one can't be stomped on.
  if (currentStatus === "analyzing") {
    const staleThresholdIso = new Date(Date.now() - STALE_ANALYSIS_TIMEOUT_MS).toISOString();
    const { data: staleClaim, error: staleError } = await supabase
      .from("video_analyses")
      .update({ status: "failed", error_message: STALE_TIMEOUT_MESSAGE })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "analyzing")
      .lt("updated_at", staleThresholdIso)
      .select("id");
    if (staleError) {
      return NextResponse.json({ error: staleError.message }, { status: 500 });
    }
    if (!staleClaim || staleClaim.length === 0) {
      // Still genuinely in-flight (not stale yet) — no-op, report as-is.
      return NextResponse.json({ status: "analyzing" });
    }
    currentStatus = "failed";
  }

  // Idempotent: repeated calls while already completed are a no-op that
  // just reports the current state, mirroring the dedupe philosophy in
  // src/app/api/cron/notifications.
  if (currentStatus !== "uploaded" && currentStatus !== "failed") {
    return NextResponse.json({ status: currentStatus });
  }

  // Atomic claim: the UPDATE's own WHERE clause (status still
  // uploaded/failed) is what prevents two concurrent requests — e.g. a
  // double-click before the retry button visually disables, or two
  // browser tabs — from both starting the pipeline for the same video.
  // Only the request that actually flips the row's status wins.
  const { data: claimed, error: claimError } = await supabase
    .from("video_analyses")
    .update({
      status: "analyzing",
      progress: 0,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["uploaded", "failed"])
    .select("id");
  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    // Another concurrent request already claimed it — no-op.
    return NextResponse.json({ status: "analyzing" });
  }

  try {
    await runAnalysisPipeline(supabase, id, user.id);
    return NextResponse.json({ status: "started" });
  } catch (pipelineError) {
    const message =
      pipelineError instanceof PipelineError || pipelineError instanceof Error
        ? pipelineError.message
        : "解析中に不明なエラーが発生しました";
    await supabase
      .from("video_analyses")
      .update({ status: "failed", error_message: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
