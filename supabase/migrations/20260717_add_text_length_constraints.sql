-- Adds server-side (DB-level) character limits to free-text columns that
-- previously had none on the server side — only the client UI enforced any
-- limit (and for most match-record fields, not even that; see
-- docs/known-limitations.md item 9 from the previous audit round).
--
-- Without this, RLS + client-side maxLength is not "input validation", it's
-- "input validation the client can choose to skip" — anyone calling the
-- Supabase REST API directly with a valid session (browser devtools, curl,
-- a modified build) could insert arbitrarily large text into any of these
-- columns, which is both an abuse vector (storage bloat, oversized rows
-- degrading query performance / PDF export / CSV export) and a mismatch
-- between what the UI promises and what the server actually allows.
--
-- Uses `not valid`, exactly like the existing hardening migration
-- (20260717_harden_video_analysis.sql): this validates only NEW inserts/
-- updates going forward. Existing rows that already exceed a limit (if
-- any) are left untouched — this migration can never fail or lock up due
-- to pre-existing data, and is safe to run against a live production
-- database at any time. All statements are idempotent (drop-if-exists then
-- add) and safe to re-run.
--
-- Limits mirror src/lib/inputLimits.ts (SHORT_TEXT_MAX = 200,
-- LONG_TEXT_MAX = 2000, URL_MAX = 2000) — keep both in sync if either
-- changes.

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

-- Username has an app-level 3-20 char pattern check
-- (src/lib/profile.ts validateUsername) but no DB-level bound at all
-- before this — a direct REST API call could otherwise insert an
-- arbitrarily long username despite the unique index on it.
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
