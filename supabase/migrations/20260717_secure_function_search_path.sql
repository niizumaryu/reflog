-- ------------------------------------------------------------------
-- REFLOG migration: harden function search_path (defense in depth)
--
-- Run this file's contents in the Supabase SQL Editor (New query > paste
-- this whole file > Run). Safe to re-run (idempotent, CREATE OR REPLACE).
--
-- Supabase's database linter flags any function without an explicit
-- search_path as "function search path mutable": a caller could set an
-- unusual session-level search_path before invoking the function, and if
-- the function referenced an unqualified object name, it could resolve to
-- an attacker-controlled object in another schema instead of the intended
-- one.
--
-- All four trigger functions below already qualify every table reference
-- with `public.` (see supabase/schema.sql), so this was not an exploitable
-- gap in practice. This migration pins `search_path = public, pg_temp`
-- explicitly anyway, purely as defense in depth and to clear the linter
-- warning — it does not change any function's behavior.
--
-- No table, column, policy, trigger, or bucket is touched.
-- ------------------------------------------------------------------

create or replace function public.enforce_video_analysis_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = old.status then
    if new.progress < old.progress then
      raise exception 'video_analyses.progress cannot decrease while status is unchanged (% -> %)', old.progress, new.progress;
    end if;
    return new;
  end if;

  if not (
    (old.status in ('uploaded', 'failed') and new.status = 'analyzing')
    or (old.status = 'analyzing' and new.status in ('completed', 'completed_insufficient_quality', 'failed'))
  ) then
    raise exception 'Invalid video_analyses status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_video_analysis_ownership()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id
  from public.video_analyses
  where id = new.video_analysis_id;

  if owner_id is null then
    raise exception 'video_analysis_id % does not exist', new.video_analysis_id;
  end if;

  if owner_id <> new.user_id then
    raise exception 'video_analysis_id % does not belong to user %', new.video_analysis_id, new.user_id;
  end if;

  return new;
end;
$$;

create or replace function public.protect_profile_plan_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
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

create or replace function public.enforce_video_analysis_quota()
returns trigger
language plpgsql
set search_path = public, pg_temp
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
