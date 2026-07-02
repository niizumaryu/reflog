-- REFLOG Version 0.3 schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

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

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

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

create policy "Users can view their own matches"
  on public.matches for select
  using (auth.uid() = user_id);

create policy "Users can insert their own matches"
  on public.matches for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own matches"
  on public.matches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own matches"
  on public.matches for delete
  using (auth.uid() = user_id);

create index if not exists matches_user_id_date_idx
  on public.matches (user_id, date desc, created_at desc);
