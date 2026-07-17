-- ------------------------------------------------------------------
-- REFLOG migration: AI referee video analysis (demo pipeline foundation)
--
-- Run this file's contents in the Supabase SQL Editor (New query > paste
-- this whole file > Run). Do NOT re-run supabase/schema.sql in full for
-- this change — this migration is self-contained and only adds what the
-- video-analysis feature needs.
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
-- Safety:
--   - All statements are additive and idempotent (safe to re-run).
--   - No existing table, column, policy, or bucket is modified or dropped.
--   - No existing data is touched.
--
-- Deliberately NOT added:
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
