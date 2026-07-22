-- Round 8 audit: video_analyses.match_id had no ownership check. RLS on
-- video_analyses only verifies auth.uid() = user_id on the row itself — it
-- does not stop an authenticated user from setting match_id to point at
-- another user's matches row (there is currently no UI path that does
-- this, but the Supabase REST API can be called directly with a valid
-- JWT, bypassing the app). This mirrors the existing
-- enforce_video_analysis_ownership() hardening for the analysis_* child
-- tables, applied here to video_analyses.match_id itself.
--
-- Idempotent and additive: safe to run multiple times, does not touch
-- existing rows or other tables/policies.

create or replace function public.enforce_video_analysis_match_ownership()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  match_owner_id uuid;
begin
  if new.match_id is null then
    return new;
  end if;

  select user_id into match_owner_id
  from public.matches
  where id = new.match_id;

  if match_owner_id is null then
    raise exception 'match_id % does not exist', new.match_id;
  end if;

  if match_owner_id <> new.user_id then
    raise exception 'match_id % does not belong to user %', new.match_id, new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists video_analyses_enforce_match_ownership on public.video_analyses;
create trigger video_analyses_enforce_match_ownership
  before insert or update on public.video_analyses
  for each row
  execute function public.enforce_video_analysis_match_ownership();
