-- ------------------------------------------------------------------
-- REFLOG migration: AI video analysis Phase 2.5 (operational hardening)
--
-- Run this file's contents in the Supabase SQL Editor (New query > paste
-- this whole file > Run). Do NOT re-run schema.sql or the previous
-- 20260716_add_video_analysis.sql migration for this change — this
-- migration is self-contained and only adds what Phase 2.5 needs.
--
-- What this adds:
--   1. Server-side re-validation of upload limits (duration/size/mime
--      type) as CHECK constraints on video_analyses, mirroring the
--      client-side limits in src/lib/video-analysis/constants.ts so a
--      hand-crafted request can't bypass the browser-side checks.
--   2. A free/paid/admin plan foundation on the existing `profiles`
--      table (reused, per the "reuse existing user tables" guidance):
--      plan_type + monthly usage counter + reset period, enforced by a
--      quota trigger on video_analyses INSERT so the limit can't be
--      bypassed by calling supabase-js directly, and a column-guard
--      trigger so a client can't rewrite its own plan/usage by calling
--      profiles.update() directly.
--   3. A small, independently-editable plan_limits table so the free
--      tier's monthly cap can be changed later with a single UPDATE,
--      without another migration or app deploy.
--   4. An index to support the "has this analysis been stuck too long"
--      query used by the analyze Route Handler's stale-retry logic.
--
-- Safety:
--   - All statements are additive and idempotent (safe to re-run).
--   - No existing table, column, policy, or bucket is dropped.
--   - No existing data is deleted. Existing profiles get plan_type =
--     'free' and monthly_video_analysis_count = 0 via column DEFAULTs,
--     so nobody already using the feature loses access.
--   - The new CHECK constraints on video_analyses are added NOT VALID:
--     they apply to all new inserts/updates immediately, but do not
--     require re-validating (and potentially failing on) any row
--     created before this migration.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 1. Server-side re-validation of upload limits on video_analyses.
--    Mirrors src/lib/video-analysis/constants.ts:
--      MIN_VIDEO_DURATION_SECONDS = 2
--      MAX_VIDEO_DURATION_SECONDS = 15 * 60 = 900
--      MAX_VIDEO_SIZE_BYTES       = 300 * 1024 * 1024 = 314572800
--      ALLOWED_VIDEO_MIME_TYPES   = video/mp4, video/quicktime, video/webm
--    If those constants ever change, update the numbers below to match.
-- ------------------------------------------------------------------
alter table public.video_analyses
  drop constraint if exists video_analyses_duration_seconds_check;
alter table public.video_analyses
  add constraint video_analyses_duration_seconds_check
  check (duration_seconds is null or (duration_seconds >= 2 and duration_seconds <= 900))
  not valid;

alter table public.video_analyses
  drop constraint if exists video_analyses_file_size_bytes_check;
alter table public.video_analyses
  add constraint video_analyses_file_size_bytes_check
  check (file_size_bytes >= 0 and file_size_bytes <= 314572800)
  not valid;

alter table public.video_analyses
  drop constraint if exists video_analyses_mime_type_check;
alter table public.video_analyses
  add constraint video_analyses_mime_type_check
  check (mime_type in ('video/mp4', 'video/quicktime', 'video/webm'))
  not valid;

-- Supports the analyze Route Handler's stale-analysis lookup
-- (status = 'analyzing' and updated_at older than a threshold).
create index if not exists video_analyses_status_updated_at_idx
  on public.video_analyses (status, updated_at);

-- ------------------------------------------------------------------
-- 2. Plan + monthly usage columns on the existing profiles table.
--    plan_type: 'free' (default for everyone, including existing
--    users), 'pro' (reserved for a future paid tier — no payment
--    processing is wired up yet), 'admin' (developer/tester,
--    unlimited). Changing a user's plan today is a manual SQL Editor
--    operation (see the migration's companion runbook / final report);
--    there is no in-app billing flow.
-- ------------------------------------------------------------------
alter table public.profiles
  add column if not exists plan_type text not null default 'free',
  add column if not exists monthly_video_analysis_count integer not null default 0,
  add column if not exists monthly_video_analysis_period_start date not null default date_trunc('month', now())::date;

alter table public.profiles
  drop constraint if exists profiles_plan_type_check;
alter table public.profiles
  add constraint profiles_plan_type_check
  check (plan_type in ('free', 'pro', 'admin'));

alter table public.profiles
  drop constraint if exists profiles_monthly_video_analysis_count_check;
alter table public.profiles
  add constraint profiles_monthly_video_analysis_count_check
  check (monthly_video_analysis_count >= 0);

-- ------------------------------------------------------------------
-- Hardening #3: block a client from rewriting its own plan or usage
-- counters through the ordinary "Users can update their own profile"
-- policy (that policy only checks ownership, not which columns
-- changed). Only two writers are allowed to touch these columns:
--   - the video_analyses quota trigger below, via a transaction-local
--     flag (reflog.bypass_plan_guard) it sets right before its UPDATE;
--   - a superuser/service-role session (Supabase SQL Editor runs as
--     `postgres`; a future admin tool would use the service-role key),
--     which this trigger explicitly lets through by role name.
-- ------------------------------------------------------------------
create or replace function public.protect_profile_plan_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('reflog.bypass_plan_guard', true) = 'on' then
    return new;
  end if;

  if session_user in ('postgres', 'service_role') or current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if new.plan_type is distinct from old.plan_type then
    raise exception 'plan_type is managed by the system and cannot be changed directly';
  end if;
  if new.monthly_video_analysis_count is distinct from old.monthly_video_analysis_count then
    raise exception 'monthly_video_analysis_count is managed by the system and cannot be changed directly';
  end if;
  if new.monthly_video_analysis_period_start is distinct from old.monthly_video_analysis_period_start then
    raise exception 'monthly_video_analysis_period_start is managed by the system and cannot be changed directly';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_plan_columns on public.profiles;
create trigger profiles_protect_plan_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_plan_columns();

-- ------------------------------------------------------------------
-- 3. plan_limits: one row per plan_type, holding the monthly cap.
--    monthly_analysis_limit = null means unlimited (used for 'admin').
--    Editable later with a single UPDATE, e.g.:
--      update public.plan_limits set monthly_analysis_limit = 10
--        where plan_type = 'free';
--    The ON CONFLICT DO NOTHING seed below means re-running this
--    migration never clobbers a limit you've since tuned by hand.
-- ------------------------------------------------------------------
create table if not exists public.plan_limits (
  plan_type text primary key,
  monthly_analysis_limit integer,
  label text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.plan_limits
  drop constraint if exists plan_limits_limit_check;
alter table public.plan_limits
  add constraint plan_limits_limit_check
  check (monthly_analysis_limit is null or monthly_analysis_limit >= 0);

insert into public.plan_limits (plan_type, monthly_analysis_limit, label)
values
  ('free', 5, '無料プラン'),
  ('pro', 50, '有料プラン(準備中)'),
  ('admin', null, '管理者・開発者(無制限)')
on conflict (plan_type) do nothing;

alter table public.plan_limits enable row level security;

drop policy if exists "Authenticated users can view plan limits" on public.plan_limits;
create policy "Authenticated users can view plan limits"
  on public.plan_limits for select
  using (auth.role() = 'authenticated');

-- No insert/update/delete policy is defined for plan_limits, so only a
-- superuser/service-role session (which bypasses RLS) can change it —
-- exactly the "edit via SQL Editor" model described above.

-- ------------------------------------------------------------------
-- Hardening #4: enforce the monthly quota at the moment a new
-- video_analyses row is created, not just in application code. This
-- means even a hand-crafted request straight to PostgREST (bypassing
-- the Next.js app entirely) is still subject to the same limit, and
-- the check + increment happen atomically with the insert (both in
-- the same transaction), so two simultaneous uploads from the same
-- user can't both slip in under the limit.
--
-- Quota is spent once per created analysis (i.e. once per uploaded
-- video), not per analyze/retry attempt — retrying a stuck or failed
-- analysis re-runs the pipeline on the SAME row and does not consume
-- another unit.
-- ------------------------------------------------------------------
create or replace function public.enforce_video_analysis_quota()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_count integer;
  v_period_start date;
  v_current_month date := date_trunc('month', now())::date;
  v_limit integer;
  v_limit_found boolean;
begin
  select plan_type, monthly_video_analysis_count, monthly_video_analysis_period_start
    into v_plan, v_count, v_period_start
    from public.profiles
    where id = new.user_id
    for update;

  if not found then
    raise exception 'video analysis quota check failed: no profile for this user';
  end if;

  if v_period_start is distinct from v_current_month then
    v_count := 0;
    v_period_start := v_current_month;
  end if;

  select monthly_analysis_limit into v_limit
    from public.plan_limits
    where plan_type = v_plan;
  v_limit_found := found;

  if not v_limit_found then
    raise exception 'video analysis quota check failed: unknown plan_type %', v_plan;
  end if;

  if v_limit is not null and v_count >= v_limit then
    raise exception 'quota_exceeded: monthly video analysis limit reached for plan %', v_plan;
  end if;

  perform set_config('reflog.bypass_plan_guard', 'on', true);
  update public.profiles
    set monthly_video_analysis_count = v_count + 1,
        monthly_video_analysis_period_start = v_period_start,
        updated_at = now()
    where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists video_analyses_enforce_quota on public.video_analyses;
create trigger video_analyses_enforce_quota
  before insert on public.video_analyses
  for each row
  execute function public.enforce_video_analysis_quota();
