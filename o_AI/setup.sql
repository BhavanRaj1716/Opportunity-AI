-- ============================================================
-- OpportunityAI — full schema setup for the NEW Supabase project
-- Run this once in the New Project's SQL Editor (all at once).
-- Recreates the same tables/columns/functions as the old project,
-- with no data (fresh, empty tables).
-- ============================================================

-- 1. Extensions -------------------------------------------------
create extension if not exists vector;
create extension if not exists pgcrypto; -- gives us gen_random_uuid()

-- 2. Enums --------------------------------------------------------
create type public.opportunity_type as enum (
  'hackathon', 'workshop', 'competition', 'internship'
);

create type public.activity_action as enum (
  'viewed', 'saved', 'applied', 'dismissed'
);

create type public.app_role as enum (
  'admin', 'user'
);

-- 3. Shared trigger function --------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4. Core reference tables -----------------------------------------
create table public.skills (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  category text
);

create table public.interests (
  id uuid not null default gen_random_uuid() primary key,
  name text not null
);

create table public.career_tracks (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  description text not null,
  sort_order integer not null default 100,
  created_at timestamp with time zone not null default now()
);

create table public.career_track_skills (
  id uuid not null default gen_random_uuid() primary key,
  track_id uuid not null references public.career_tracks(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  importance integer not null default 70,
  unique (track_id, skill_id)
);

-- 5. Profiles (one per student, linked to Supabase Auth user) ------
create table public.profiles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  department text,
  year integer,
  location text,
  career_goal text,
  raw_intro text,
  profile_embedding vector(384),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.profile_skills (
  id uuid not null default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency integer not null default 50,
  unique (profile_id, skill_id)
);

create table public.profile_interests (
  id uuid not null default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  weight integer not null default 50,
  unique (profile_id, interest_id)
);

-- 6. Opportunities ----------------------------------------------------
create table public.opportunities (
  id uuid not null default gen_random_uuid() primary key,
  title text not null,
  description text,
  type public.opportunity_type not null,
  location text,
  is_online boolean not null default false,
  start_date date,
  end_date date,
  registration_deadline date,
  organizer text,
  url text,
  embedding vector(384),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.opportunity_skills (
  id uuid not null default gen_random_uuid() primary key,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  importance integer not null default 70,
  unique (opportunity_id, skill_id)
);

-- 7. Explanation cache ("Why this?" bullets) ---------------------------
create table public.match_explanations (
  id uuid not null default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  bullets jsonb not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (profile_id, opportunity_id)
);

-- 8. User activity + roles ---------------------------------------------
create table public.user_activity (
  id uuid not null default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  action public.activity_action not null,
  created_at timestamp with time zone not null default now()
);

create table public.user_roles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

-- 9. updated_at triggers -------------------------------------------------
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger opportunities_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

create trigger match_explanations_updated_at
before update on public.match_explanations
for each row execute function public.set_updated_at();

-- 10. Helper functions ------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$ language sql stable security definer;

create or replace function public.match_opportunities(query_embedding vector, match_count integer)
returns table (id uuid, similarity float) as $$
  select o.id, 1 - (o.embedding <=> query_embedding) as similarity
  from public.opportunities o
  where o.embedding is not null
  order by o.embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

-- 11. Row Level Security -------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_skills enable row level security;
alter table public.profile_interests enable row level security;
alter table public.match_explanations enable row level security;
alter table public.user_activity enable row level security;
alter table public.user_roles enable row level security;
alter table public.career_tracks enable row level security;
alter table public.career_track_skills enable row level security;

create policy "own profile" on public.profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own profile skills" on public.profile_skills for all
  using (exists (select 1 from public.profiles p where p.id = profile_skills.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_skills.profile_id and p.user_id = auth.uid()));

create policy "own profile interests" on public.profile_interests for all
  using (exists (select 1 from public.profiles p where p.id = profile_interests.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_interests.profile_id and p.user_id = auth.uid()));

create policy "own match explanations" on public.match_explanations for all
  using (exists (select 1 from public.profiles p where p.id = match_explanations.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = match_explanations.profile_id and p.user_id = auth.uid()));

create policy "own activity" on public.user_activity for all
  using (exists (select 1 from public.profiles p where p.id = user_activity.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = user_activity.profile_id and p.user_id = auth.uid()));

create policy "own role rows readable" on public.user_roles for select
  using (auth.uid() = user_id);

create policy "career tracks readable" on public.career_tracks for select using (true);
create policy "career track skills readable" on public.career_track_skills for select using (true);

-- Opportunities, skills, interests are public read tables (no RLS needed for SELECT,
-- but service_role bypasses RLS anyway, so the Node backend can always read/write).

-- 12. Grants -------------------------------------------------------------
grant select on public.skills, public.interests, public.career_tracks,
  public.career_track_skills, public.opportunities, public.opportunity_skills
  to anon, authenticated;

grant select, insert, update, delete on
  public.profiles, public.profile_skills, public.profile_interests,
  public.match_explanations, public.user_activity
  to authenticated;

grant select on public.user_roles to authenticated;

grant all on all tables in schema public to service_role;

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

revoke all on function public.match_opportunities(vector, integer) from public, anon;
grant execute on function public.match_opportunities(vector, integer) to authenticated, service_role;

-- ============================================================
-- Done. Verify with: select table_name from information_schema.tables
-- where table_schema = 'public' order by table_name;
-- ============================================================
