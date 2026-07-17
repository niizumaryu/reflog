-- REFLOG schema (Version 0.3 + 0.4)
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run in full: every statement is idempotent.

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  prefecture text not null default '',
  referee_grade text not null default '',
  categories text[] not null default '{}',
  years_of_experience integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- matches
-- ------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date,
  competition text not null default '',
  category text not null default '',
  match_count integer not null default 0,
  partner_referee text not null default '',
  referee_position text not null default '',
  judgment_rating integer not null default 0,
  position_rating integer not null default 0,
  communication_rating integer not null default 0,
  good_points text not null default '',
  improvements text not null default '',
  next_goal text not null default '',
  difficult_calls text not null default '',
  free_notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

drop policy if exists "Users can view their own matches" on public.matches;
create policy "Users can view their own matches"
  on public.matches for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own matches" on public.matches;
create policy "Users can insert their own matches"
  on public.matches for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own matches" on public.matches;
create policy "Users can update their own matches"
  on public.matches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own matches" on public.matches;
create policy "Users can delete their own matches"
  on public.matches for delete
  using (auth.uid() = user_id);

create index if not exists matches_user_id_date_idx
  on public.matches (user_id, date desc, created_at desc);

-- ------------------------------------------------------------------
-- Version 0.4: profile username + avatar
-- ------------------------------------------------------------------
alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_type text not null default 'default',
  add column if not exists avatar_key text not null default 'basketball',
  add column if not exists avatar_url text;

-- Username must be unique when set, but stays nullable at the DB level
-- because the signup trigger creates a profile row before the user has
-- chosen one. "Required" is enforced in the app (profile setup screen).
create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_avatar_type_check;
alter table public.profiles
  add constraint profiles_avatar_type_check
  check (avatar_type in ('default', 'custom'));

-- ------------------------------------------------------------------
-- Storage: profile-icons bucket for uploaded avatar images
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-icons',
  'profile-icons',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored at `${auth.uid()}/filename.ext`, so the first path
-- segment (storage.foldername) doubles as the ownership check.
drop policy if exists "Anyone can view profile icons" on storage.objects;
create policy "Anyone can view profile icons"
  on storage.objects for select
  using (bucket_id = 'profile-icons');

drop policy if exists "Users can upload their own profile icon" on storage.objects;
create policy "Users can upload their own profile icon"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-icons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own profile icon" on storage.objects;
create policy "Users can update their own profile icon"
  on storage.objects for update
  using (
    bucket_id = 'profile-icons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own profile icon" on storage.objects;
create policy "Users can delete their own profile icon"
  on storage.objects for delete
  using (
    bucket_id = 'profile-icons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ------------------------------------------------------------------
-- Version 0.5.1: annual_goals (年間目標試合数)
-- ------------------------------------------------------------------
create table if not exists public.annual_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null,
  target_match_count integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

alter table public.annual_goals enable row level security;

drop policy if exists "Users can view their own annual goals" on public.annual_goals;
create policy "Users can view their own annual goals"
  on public.annual_goals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own annual goals" on public.annual_goals;
create policy "Users can insert their own annual goals"
  on public.annual_goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own annual goals" on public.annual_goals;
create policy "Users can update their own annual goals"
  on public.annual_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- schedules (予定管理)
-- ------------------------------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  scheduled_date date,
  scheduled_time time,
  place text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adds the time column for installs where the table was already created
-- (via Supabase Studio) before it was tracked here.
alter table public.schedules
  add column if not exists scheduled_time time;
alter table public.schedules
  add column if not exists updated_at timestamptz not null default now();

alter table public.schedules enable row level security;

drop policy if exists "Users can view their own schedules" on public.schedules;
create policy "Users can view their own schedules"
  on public.schedules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own schedules" on public.schedules;
create policy "Users can insert their own schedules"
  on public.schedules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own schedules" on public.schedules;
create policy "Users can update their own schedules"
  on public.schedules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own schedules" on public.schedules;
create policy "Users can delete their own schedules"
  on public.schedules for delete
  using (auth.uid() = user_id);

create index if not exists schedules_user_id_date_idx
  on public.schedules (user_id, scheduled_date asc);

-- ------------------------------------------------------------------
-- Version 0.9: match log expansion (試合ログ機能)
-- Adds richer per-match fields on top of the existing `matches` table.
-- All new columns are additive with safe defaults; no existing column
-- is renamed, retyped, or dropped, and no existing rows are touched.
-- ------------------------------------------------------------------
alter table public.matches
  add column if not exists venue text not null default '',
  add column if not exists home_team text not null default '',
  add column if not exists away_team text not null default '',
  add column if not exists match_role text not null default '',
  add column if not exists start_time time,
  add column if not exists mechanics_rating integer not null default 0,
  add column if not exists game_control_rating integer not null default 0,
  add column if not exists stamina_rating integer not null default 0,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists video_url text not null default '',
  -- Left nullable here on purpose so the backfill below can tell which
  -- rows are pre-existing (NULL) vs. already handled on a re-run.
  add column if not exists updated_at timestamptz;

-- Backfills existing rows with their own created_at instead of the
-- migration's run time. Only touches rows that have never been set
-- (safe to re-run: already-backfilled or since-updated rows are skipped).
update public.matches set updated_at = created_at where updated_at is null;

alter table public.matches
  alter column updated_at set default now(),
  alter column updated_at set not null;

create index if not exists matches_keywords_gin_idx
  on public.matches using gin (keywords);

-- No RLS changes needed: the existing select/insert/update/delete policies
-- on public.matches already cover these new columns since they filter by
-- row (auth.uid() = user_id), not by column.

-- ------------------------------------------------------------------
-- Version 1.0: Quick Log entry type
-- Adds one column so the app can tell whether a record was created via the
-- 30-second Quick Log form or the full detailed form. Additive only: no
-- existing column is renamed/retyped, no existing rows are touched beyond
-- getting the 'detailed' default, and RLS is unaffected (still row-scoped).
-- ------------------------------------------------------------------
alter table public.matches
  add column if not exists entry_type text not null default 'detailed';

alter table public.matches
  drop constraint if exists matches_entry_type_check;
alter table public.matches
  add constraint matches_entry_type_check
  check (entry_type in ('quick', 'detailed'));

-- ------------------------------------------------------------------
-- Version 1.1: PWA push notifications
-- Adds subscription storage, a per-user on/off setting, and a send log
-- used to dedupe scheduled reminders (day-before / match-day / no-record).
-- ------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

drop policy if exists "Users can view their own notification settings" on public.notification_settings;
create policy "Users can view their own notification settings"
  on public.notification_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notification settings" on public.notification_settings;
create policy "Users can insert their own notification settings"
  on public.notification_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notification settings" on public.notification_settings;
create policy "Users can update their own notification settings"
  on public.notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Written only by the service-role cron route (src/app/api/cron/notifications),
-- which bypasses RLS. No client-facing policies are defined on purpose, so
-- anon/authenticated clients get zero access to this table.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  reference_id uuid,
  sent_for_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, type, reference_id, sent_for_date)
);

alter table public.notification_log enable row level security;

alter table public.notification_log
  drop constraint if exists notification_log_type_check;
alter table public.notification_log
  add constraint notification_log_type_check
  check (type in ('day_before_match', 'match_day_reminder', 'no_record_reminder'));

-- ------------------------------------------------------------------
-- Version 1.2: Notification center + per-type settings
-- Extends the Version 1.1 push foundation with a user-facing notification
-- center, per-notification-type toggles, and configurable send times.
-- All changes are additive: existing rows and existing columns are
-- untouched, only new columns (with safe defaults) and a new table are
-- added.
-- ------------------------------------------------------------------

-- Per-type toggles (all default true so existing users keep receiving the
-- same notifications they already get today) and configurable send times.
alter table public.notification_settings
  add column if not exists day_before_match_enabled boolean not null default true,
  add column if not exists match_day_reminder_enabled boolean not null default true,
  add column if not exists no_record_reminder_enabled boolean not null default true,
  add column if not exists monthly_reflection_enabled boolean not null default true,
  add column if not exists ai_advice_enabled boolean not null default true,
  add column if not exists notify_time time not null default '20:00',
  add column if not exists match_day_time time not null default '08:00';

-- notification_log.reference_id widens from uuid to text so non-schedule
-- keys (a month string for monthly_reflection, a date string for
-- ai_advice) can also be used for dedupe. Existing uuid values round-trip
-- unchanged as text.
alter table public.notification_log
  alter column reference_id type text using reference_id::text;

alter table public.notification_log
  drop constraint if exists notification_log_type_check;
alter table public.notification_log
  add constraint notification_log_type_check
  check (type in (
    'day_before_match',
    'match_day_reminder',
    'no_record_reminder',
    'monthly_reflection',
    'ai_advice'
  ));

-- notifications: the user-facing notification center feed. Distinct from
-- notification_log (which only exists to dedupe scheduled sends) — this
-- table is what /notifications reads/writes, and rows are created
-- regardless of whether the user has an active push subscription.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  url text not null default '/',
  reference_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'day_before_match',
    'match_day_reminder',
    'no_record_reminder',
    'monthly_reflection',
    'ai_advice'
  ));

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Insert is allowed for the owning user too (not just the service role)
-- because the AI-advice notification is created client-side right after a
-- match record is saved.
drop policy if exists "Users can insert their own notifications" on public.notifications;
create policy "Users can insert their own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_is_read_idx
  on public.notifications (user_id, is_read);

-- ------------------------------------------------------------------
-- Version 1.3: AI referee video analysis (demo pipeline foundation)
--
-- NOTE: this section is also available as a standalone, already-applied
-- migration at supabase/migrations/20260716_add_video_analysis.sql — if
-- you already ran that file against this project, re-running this
-- section (as part of a full schema.sql reapply) is a safe no-op.
--
-- Adds a video-analysis feature: users upload match video, the app
-- computes REAL video metadata/quality metrics client-side (duration,
-- resolution, brightness, blur proxy, etc.), and a clearly-labeled
-- DEMO/simulated detection + coaching pipeline runs behind swappable
-- adapter interfaces (see src/lib/video-analysis). No real object
-- detection, tracking, or pose estimation runs yet — every row produced
-- by the demo pipeline is flagged is_demo = true and every finding
-- carries confidence + uncertainty fields so the UI never presents a
-- guess as a fact.
--
-- All statements are additive and idempotent. No existing table,
-- column, policy, or bucket is modified or dropped.
--
-- Deliberately NOT added this version:
--   - analysis_jobs: there is no real async worker/queue yet, so
--     status/progress live directly on video_analyses instead.
--   - analysis_tracks: per-frame tracking data needs an object-storage
--     or columnar (e.g. Parquet) strategy decided later, not a row-per
--     -frame relational table.
-- ------------------------------------------------------------------

create table if not exists public.video_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  title text not null default '',
  storage_path text not null,
  original_filename text not null default '',
  mime_type text not null default '',
  file_size_bytes bigint not null default 0,
  duration_seconds numeric,
  width_px integer,
  height_px integer,
  estimated_fps numeric,
  status text not null default 'uploaded',
  progress integer not null default 0,
  is_demo boolean not null default true,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_analyses
  drop constraint if exists video_analyses_status_check;
alter table public.video_analyses
  add constraint video_analyses_status_check
  check (status in (
    'uploaded',
    'analyzing',
    'completed',
    'completed_insufficient_quality',
    'failed'
  ));

alter table public.video_analyses
  drop constraint if exists video_analyses_progress_check;
alter table public.video_analyses
  add constraint video_analyses_progress_check
  check (progress >= 0 and progress <= 100);

alter table public.video_analyses enable row level security;

drop policy if exists "Users can view their own video analyses" on public.video_analyses;
create policy "Users can view their own video analyses"
  on public.video_analyses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own video analyses" on public.video_analyses;
create policy "Users can insert their own video analyses"
  on public.video_analyses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own video analyses" on public.video_analyses;
create policy "Users can update their own video analyses"
  on public.video_analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own video analyses" on public.video_analyses;
create policy "Users can delete their own video analyses"
  on public.video_analyses for delete
  using (auth.uid() = user_id);

create index if not exists video_analyses_user_id_created_at_idx
  on public.video_analyses (user_id, created_at desc);

-- ------------------------------------------------------------------
-- Hardening #1: status can only move through the legal state graph,
-- no matter who issues the UPDATE. RLS above only checks ownership
-- (auth.uid() = user_id) — it does not stop an authenticated owner's
-- own browser session from jumping straight to status = 'completed'
-- with a fabricated progress = 100. This trigger closes that gap by
-- enforcing the same transition rules the app's own pipeline follows,
-- as a database-level invariant instead of trusting a single call site.
--
-- Allowed transitions:
--   uploaded          -> analyzing
--   uploaded          -> failed
--   failed            -> analyzing   (retry)
--   analyzing         -> completed
--   analyzing         -> completed_insufficient_quality
--   analyzing         -> failed
--   analyzing         -> analyzing   (progress bump only)
--   completed / completed_insufficient_quality / failed are terminal:
--     only a same-status update (no-op) is allowed from them.
-- Progress may only decrease when re-entering 'analyzing' (reset to 0);
-- otherwise it must be >= the previous value.
-- ------------------------------------------------------------------
create or replace function public.enforce_video_analysis_status_transition()
returns trigger
language plpgsql
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

drop trigger if exists video_analyses_enforce_status_transition on public.video_analyses;
create trigger video_analyses_enforce_status_transition
  before update on public.video_analyses
  for each row
  execute function public.enforce_video_analysis_status_transition();

-- analysis_quality_metrics: one row per video, holding REAL numbers
-- computed client-side from sampled video frames (not model output).
create table if not exists public.analysis_quality_metrics (
  id uuid primary key default gen_random_uuid(),
  video_analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sampled_frame_count integer not null default 0,
  mean_brightness numeric,
  brightness_stddev numeric,
  dark_frame_ratio numeric,
  overexposed_frame_ratio numeric,
  blur_proxy_score numeric,
  quality_tier text not null,
  quality_reasons text[] not null default '{}',
  raw_metrics jsonb not null default '{}',
  computed_at timestamptz not null default now(),
  unique (video_analysis_id)
);

alter table public.analysis_quality_metrics
  drop constraint if exists analysis_quality_metrics_tier_check;
alter table public.analysis_quality_metrics
  add constraint analysis_quality_metrics_tier_check
  check (quality_tier in ('insufficient', 'low', 'medium', 'high'));

alter table public.analysis_quality_metrics enable row level security;

drop policy if exists "Users can view their own quality metrics" on public.analysis_quality_metrics;
create policy "Users can view their own quality metrics"
  on public.analysis_quality_metrics for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own quality metrics" on public.analysis_quality_metrics;
create policy "Users can insert their own quality metrics"
  on public.analysis_quality_metrics for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own quality metrics" on public.analysis_quality_metrics;
create policy "Users can update their own quality metrics"
  on public.analysis_quality_metrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own quality metrics" on public.analysis_quality_metrics;
create policy "Users can delete their own quality metrics"
  on public.analysis_quality_metrics for delete
  using (auth.uid() = user_id);

-- analysis_events: DEMO detection candidates (never a definitive ruling).
-- event_type values are deliberately framed as candidates/estimates, e.g.
-- 'possible_traveling', never 'foul' or 'traveling'.
create table if not exists public.analysis_events (
  id uuid primary key default gen_random_uuid(),
  video_analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null,
  event_type text not null,
  timestamp_seconds numeric,
  conclusion text not null default '',
  evidence text not null default '',
  confidence jsonb not null default '{}',
  why_uncertain text not null default '',
  alternative_interpretation text not null default '',
  missing_data text not null default '',
  human_review_recommended boolean not null default true,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.analysis_events
  drop constraint if exists analysis_events_stage_check;
alter table public.analysis_events
  add constraint analysis_events_stage_check
  check (stage in (
    'court_detection',
    'person_detection',
    'ball_detection',
    'event_detection'
  ));

alter table public.analysis_events enable row level security;

drop policy if exists "Users can view their own analysis events" on public.analysis_events;
create policy "Users can view their own analysis events"
  on public.analysis_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analysis events" on public.analysis_events;
create policy "Users can insert their own analysis events"
  on public.analysis_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own analysis events" on public.analysis_events;
create policy "Users can update their own analysis events"
  on public.analysis_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own analysis events" on public.analysis_events;
create policy "Users can delete their own analysis events"
  on public.analysis_events for delete
  using (auth.uid() = user_id);

create index if not exists analysis_events_video_analysis_id_timestamp_idx
  on public.analysis_events (video_analysis_id, timestamp_seconds);

-- coaching_results: one DEMO coaching summary per video.
create table if not exists public.coaching_results (
  id uuid primary key default gen_random_uuid(),
  video_analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text not null default '',
  strengths text[] not null default '{}',
  growth_areas text[] not null default '{}',
  conclusion text not null default '',
  evidence text not null default '',
  confidence jsonb not null default '{}',
  why_uncertain text not null default '',
  alternative_interpretation text not null default '',
  missing_data text not null default '',
  human_review_recommended boolean not null default true,
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (video_analysis_id)
);

alter table public.coaching_results enable row level security;

drop policy if exists "Users can view their own coaching results" on public.coaching_results;
create policy "Users can view their own coaching results"
  on public.coaching_results for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own coaching results" on public.coaching_results;
create policy "Users can insert their own coaching results"
  on public.coaching_results for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own coaching results" on public.coaching_results;
create policy "Users can update their own coaching results"
  on public.coaching_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own coaching results" on public.coaching_results;
create policy "Users can delete their own coaching results"
  on public.coaching_results for delete
  using (auth.uid() = user_id);

-- analysis_feedback: user agreement/disagreement/corrections on demo
-- output. target_id intentionally has no foreign key since it can point
-- at either analysis_events or coaching_results; validated app-side.
create table if not exists public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  video_analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  rating text not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table public.analysis_feedback
  drop constraint if exists analysis_feedback_target_type_check;
alter table public.analysis_feedback
  add constraint analysis_feedback_target_type_check
  check (target_type in ('event', 'coaching'));

alter table public.analysis_feedback
  drop constraint if exists analysis_feedback_rating_check;
alter table public.analysis_feedback
  add constraint analysis_feedback_rating_check
  check (rating in ('agree', 'disagree', 'unsure'));

alter table public.analysis_feedback enable row level security;

drop policy if exists "Users can view their own analysis feedback" on public.analysis_feedback;
create policy "Users can view their own analysis feedback"
  on public.analysis_feedback for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analysis feedback" on public.analysis_feedback;
create policy "Users can insert their own analysis feedback"
  on public.analysis_feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own analysis feedback" on public.analysis_feedback;
create policy "Users can update their own analysis feedback"
  on public.analysis_feedback for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own analysis feedback" on public.analysis_feedback;
create policy "Users can delete their own analysis feedback"
  on public.analysis_feedback for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Hardening #2: a child row's video_analysis_id must actually belong
-- to the same user_id inserting the row. Without this, RLS alone only
-- checks the child row's own user_id — nothing stops an authenticated
-- user from inserting e.g. an analysis_events row whose
-- video_analysis_id points at a different user's video_analyses.id.
-- ------------------------------------------------------------------
create or replace function public.enforce_video_analysis_ownership()
returns trigger
language plpgsql
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

drop trigger if exists analysis_quality_metrics_enforce_ownership on public.analysis_quality_metrics;
create trigger analysis_quality_metrics_enforce_ownership
  before insert on public.analysis_quality_metrics
  for each row
  execute function public.enforce_video_analysis_ownership();

drop trigger if exists analysis_events_enforce_ownership on public.analysis_events;
create trigger analysis_events_enforce_ownership
  before insert on public.analysis_events
  for each row
  execute function public.enforce_video_analysis_ownership();

drop trigger if exists coaching_results_enforce_ownership on public.coaching_results;
create trigger coaching_results_enforce_ownership
  before insert on public.coaching_results
  for each row
  execute function public.enforce_video_analysis_ownership();

drop trigger if exists analysis_feedback_enforce_ownership on public.analysis_feedback;
create trigger analysis_feedback_enforce_ownership
  before insert on public.analysis_feedback
  for each row
  execute function public.enforce_video_analysis_ownership();

-- ------------------------------------------------------------------
-- Storage: match-videos bucket for uploaded match video (PRIVATE —
-- unlike profile-icons, this bucket must never be public since videos
-- may show players, coaches, or minors). Playback only via signed URLs.
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  false,
  314572800, -- 300MB
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored at `${auth.uid()}/${video_analysis_id}/original.ext`,
-- so the first path segment (storage.foldername) doubles as the
-- ownership check. SELECT is also owner-gated (unlike profile-icons)
-- so only the owner can read the object or mint a signed URL for it.
drop policy if exists "Users can view their own match videos" on storage.objects;
create policy "Users can view their own match videos"
  on storage.objects for select
  using (
    bucket_id = 'match-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can upload their own match videos" on storage.objects;
create policy "Users can upload their own match videos"
  on storage.objects for insert
  with check (
    bucket_id = 'match-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own match videos" on storage.objects;
create policy "Users can update their own match videos"
  on storage.objects for update
  using (
    bucket_id = 'match-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own match videos" on storage.objects;
create policy "Users can delete their own match videos"
  on storage.objects for delete
  using (
    bucket_id = 'match-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ------------------------------------------------------------------
-- AI video analysis Phase 2.5: operational hardening (upload limit
-- re-validation, stale-analysis index, plan/usage foundation). This
-- section mirrors supabase/migrations/20260717_harden_video_analysis.sql
-- exactly — see that file for the full explanation of each part. Kept
-- in sync here so schema.sql remains a complete, idempotent, from-
-- scratch reference; day-to-day changes should still be applied via
-- the standalone migration file, not by re-running this whole script.
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

create index if not exists video_analyses_status_updated_at_idx
  on public.video_analyses (status, updated_at);

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

-- ------------------------------------------------------------------
-- Second audit round: server-side character limits on free-text columns.
-- This section mirrors
-- supabase/migrations/20260717_add_text_length_constraints.sql exactly —
-- see that file for the full rationale. Kept in sync here so schema.sql
-- remains a complete, idempotent, from-scratch reference; day-to-day
-- changes should still be applied via the standalone migration file.
-- ------------------------------------------------------------------
alter table public.matches
  drop constraint if exists matches_competition_length_check;
alter table public.matches
  add constraint matches_competition_length_check
  check (char_length(competition) <= 200) not valid;

alter table public.matches
  drop constraint if exists matches_category_length_check;
alter table public.matches
  add constraint matches_category_length_check
  check (char_length(category) <= 200) not valid;

alter table public.matches
  drop constraint if exists matches_venue_length_check;
alter table public.matches
  add constraint matches_venue_length_check
  check (char_length(venue) <= 200) not valid;

alter table public.matches
  drop constraint if exists matches_home_team_length_check;
alter table public.matches
  add constraint matches_home_team_length_check
  check (char_length(home_team) <= 200) not valid;

alter table public.matches
  drop constraint if exists matches_away_team_length_check;
alter table public.matches
  add constraint matches_away_team_length_check
  check (char_length(away_team) <= 200) not valid;

alter table public.matches
  drop constraint if exists matches_partner_referee_length_check;
alter table public.matches
  add constraint matches_partner_referee_length_check
  check (char_length(partner_referee) <= 200) not valid;

alter table public.matches
  drop constraint if exists matches_video_url_length_check;
alter table public.matches
  add constraint matches_video_url_length_check
  check (char_length(video_url) <= 2000) not valid;

alter table public.matches
  drop constraint if exists matches_good_points_length_check;
alter table public.matches
  add constraint matches_good_points_length_check
  check (char_length(good_points) <= 2000) not valid;

alter table public.matches
  drop constraint if exists matches_improvements_length_check;
alter table public.matches
  add constraint matches_improvements_length_check
  check (char_length(improvements) <= 2000) not valid;

alter table public.matches
  drop constraint if exists matches_next_goal_length_check;
alter table public.matches
  add constraint matches_next_goal_length_check
  check (char_length(next_goal) <= 2000) not valid;

alter table public.matches
  drop constraint if exists matches_difficult_calls_length_check;
alter table public.matches
  add constraint matches_difficult_calls_length_check
  check (char_length(difficult_calls) <= 2000) not valid;

alter table public.matches
  drop constraint if exists matches_free_notes_length_check;
alter table public.matches
  add constraint matches_free_notes_length_check
  check (char_length(free_notes) <= 2000) not valid;

alter table public.schedules
  drop constraint if exists schedules_title_length_check;
alter table public.schedules
  add constraint schedules_title_length_check
  check (char_length(title) <= 200) not valid;

alter table public.schedules
  drop constraint if exists schedules_place_length_check;
alter table public.schedules
  add constraint schedules_place_length_check
  check (char_length(place) <= 200) not valid;

alter table public.schedules
  drop constraint if exists schedules_memo_length_check;
alter table public.schedules
  add constraint schedules_memo_length_check
  check (char_length(memo) <= 2000) not valid;

alter table public.profiles
  drop constraint if exists profiles_name_length_check;
alter table public.profiles
  add constraint profiles_name_length_check
  check (char_length(name) <= 200) not valid;

alter table public.profiles
  drop constraint if exists profiles_prefecture_length_check;
alter table public.profiles
  add constraint profiles_prefecture_length_check
  check (char_length(prefecture) <= 200) not valid;

alter table public.profiles
  drop constraint if exists profiles_referee_grade_length_check;
alter table public.profiles
  add constraint profiles_referee_grade_length_check
  check (char_length(referee_grade) <= 200) not valid;

alter table public.profiles
  drop constraint if exists profiles_username_length_check;
alter table public.profiles
  add constraint profiles_username_length_check
  check (username is null or char_length(username) <= 20) not valid;

alter table public.video_analyses
  drop constraint if exists video_analyses_title_length_check;
alter table public.video_analyses
  add constraint video_analyses_title_length_check
  check (char_length(title) <= 200) not valid;
