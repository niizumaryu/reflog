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
