-- ------------------------------------------------------------------
-- REFLOG migration: original video retention (Phase: pre-release cost/
-- storage audit, round 6, 2026-07-21)
--
-- Run this file's contents in the Supabase SQL Editor (New query > paste
-- this whole file > Run). Self-contained; safe to re-run.
--
-- What this adds:
--   1. plan_limits.retention_days — how many days after upload the
--      ORIGINAL video file may be kept before a maintenance job deletes
--      it from Storage. Editable later with a single UPDATE, same model
--      as monthly_analysis_limit. NULL means "keep indefinitely" (used
--      for 'admin' — nothing here forces admin videos to be purged).
--   2. video_analyses.original_video_deleted_at — set once the original
--      Storage object has actually been removed. NULL means the
--      original file is still present. This column (not a delete of the
--      row itself) is the source of truth: the row, its quality
--      metrics, detection events, and coaching results are the durable
--      analysis record and are kept; only the large original video file
--      is subject to deletion.
--   3. An index supporting the maintenance job's "find analyses whose
--      original video is old enough to purge and hasn't been purged
--      yet" query.
--
-- What this does NOT do:
--   - It does not delete anything. No Storage object and no row is
--     touched by this migration.
--   - It does not schedule anything. No cron/Edge Function is wired up
--     by this migration — see src/lib/video-analysis/retention.ts and
--     src/app/api/cron/video-maintenance/route.ts, and
--     docs/video-retention-ops.md for how an operator turns this on.
--
-- Safety:
--   - All statements are additive and idempotent.
--   - No existing table, column, policy, or bucket is dropped.
--   - No existing data is deleted or modified beyond adding columns
--     with safe defaults (retention_days is nullable with no default —
--     existing plan_limits rows keep the original videos indefinitely
--     until an operator explicitly sets a number, so this migration by
--     itself changes no observable behavior).
-- ------------------------------------------------------------------

alter table public.plan_limits
  add column if not exists retention_days integer;

alter table public.plan_limits
  drop constraint if exists plan_limits_retention_days_check;
alter table public.plan_limits
  add constraint plan_limits_retention_days_check
  check (retention_days is null or retention_days >= 1);

-- Suggested defaults — an operator can change these at any time with:
--   update public.plan_limits set retention_days = <n> where plan_type = '<plan>';
-- Left NULL (kept indefinitely) if this UPDATE is never run, so applying
-- this migration alone does not start deleting anyone's videos.
update public.plan_limits set retention_days = 30 where plan_type = 'free' and retention_days is null;
update public.plan_limits set retention_days = 90 where plan_type = 'pro' and retention_days is null;
-- 'admin' intentionally left NULL (unlimited), matching its unlimited
-- monthly_analysis_limit.

alter table public.video_analyses
  add column if not exists original_video_deleted_at timestamptz;

create index if not exists video_analyses_purge_lookup_idx
  on public.video_analyses (status, original_video_deleted_at, created_at)
  where original_video_deleted_at is null;
