-- Two tables that exist for opposite reasons: one shared and cached, one private and owned.
-- Full reasoning in docs/database.md.

-- The shared daily reading. Identical for everyone with that sign on that date, so it is fetched
-- once and read by everyone after.
create table if not exists public.daily_reading (
  sign          text        not null,
  reading_date  date        not null default current_date,
  payload       jsonb       not null,
  fetched_at    timestamptz not null default now(),
  primary key (sign, reading_date)
);

alter table public.daily_reading enable row level security;

-- Readable by anyone, including a signed-out visitor. There is deliberately no insert or update
-- policy: the function writes with the service role, which bypasses policies, so the cache cannot be
-- poisoned from a browser even with the anon key in hand.
create policy "daily readings are readable by anyone"
  on public.daily_reading for select
  using (true);

-- A private chart. Birth data belongs to the person who entered it.
create table if not exists public.saved_chart (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users on delete cascade,
  label       text        not null,
  birth       jsonb       not null,
  chart       jsonb       not null,
  created_at  timestamptz not null default now()
);

create index if not exists saved_chart_user_id_created_at_idx
  on public.saved_chart (user_id, created_at desc);

alter table public.saved_chart enable row level security;

-- One policy per verb rather than one permissive policy, so a later change to reads cannot widen
-- writes by accident. No policy names the anon role, so a signed-out request sees an empty result
-- rather than an error it could probe.
create policy "people read their own charts"
  on public.saved_chart for select
  using (auth.uid() = user_id);

create policy "people create their own charts"
  on public.saved_chart for insert
  with check (auth.uid() = user_id);

create policy "people update their own charts"
  on public.saved_chart for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "people delete their own charts"
  on public.saved_chart for delete
  using (auth.uid() = user_id);
