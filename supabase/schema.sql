-- Digital Heroes — Supabase/Postgres schema (production target).
-- The demo runs on a localStorage mirror of these tables (src/lib/db.js).
-- Apply with: supabase db push  (or paste into Supabase SQL editor).
-- Money uses NUMERIC; score uniqueness enforced at DB level per PRD §4.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null, role text not null default 'subscriber' check (role in ('subscriber','admin')),
  avatar_url text, created_at timestamptz default now()
);
create table if not exists plans (
  id text primary key, name text not null, interval text not null check (interval in ('monthly','yearly')),
  price numeric not null check (price >= 0), currency text default 'INR', active boolean default true
);
insert into plans(id,name,interval,price) values
  ('monthly','Monthly Hero','monthly',999), ('yearly','Yearly Champion','yearly',8999)
on conflict (id) do nothing;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  plan_id text references plans(id), provider_customer text, provider_sub text,
  status text not null check (status in ('active','cancelled','lapsed','past_due')),
  amount numeric not null, renews_at timestamptz, created_at timestamptz default now()
);
create table if not exists charities (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  image_url text, events text, featured boolean default false, active boolean default true,
  raised numeric default 0, created_at timestamptz default now()
);
create table if not exists charity_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  charity_id uuid references charities(id), contribution_pct int not null check (contribution_pct between 10 and 100)
);
create table if not exists scores (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  score_date date not null, stableford int not null check (stableford between 1 and 45),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (user_id, score_date)  -- PRD §4: one score per date, enforced in DB
);
create table if not exists draws (
  id uuid primary key default gen_random_uuid(), label text not null, mode text not null check (mode in ('random','algorithmic','scores')),
  status text not null default 'draft' check (status in ('draft','simulated','drawn','published','closed')),
  winning int[] null, algo_config jsonb default '{}', funding_pct numeric default 50,
  created_at timestamptz default now()
);
create table if not exists draw_entries (
  id uuid primary key default gen_random_uuid(), draw_id uuid references draws(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade, numbers int[] not null,
  matches int default 0, tier int default 0, unique (draw_id, user_id)
);
create table if not exists prize_pools (
  id uuid primary key default gen_random_uuid(), draw_id uuid unique references draws(id) on delete cascade,
  base numeric not null, rollover_in numeric default 0, total numeric not null,
  tier5 numeric not null, tier4 numeric not null, tier3 numeric not null
);
create table if not exists winners (
  id uuid primary key default gen_random_uuid(), draw_id uuid references draws(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade, tier int check (tier in (3,4,5)),
  amount numeric not null, verify text default 'pending' check (verify in ('pending','approved','rejected')),
  payout text default 'pending' check (payout in ('pending','paid')),
  reviewer_note text default '', paid_at timestamptz, unique (draw_id, user_id, tier)
);
create table if not exists winner_proofs (
  id uuid primary key default gen_random_uuid(), winner_id uuid references winners(id) on delete cascade,
  file_path text not null, submitted_at timestamptz default now(),
  review_status text default 'pending', reviewer uuid references profiles(id)
);
create table if not exists charity_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id),
  charity_id uuid references charities(id), source_ref text, pct int check (pct between 10 and 100),
  amount numeric not null, status text default 'recorded', created_at timestamptz default now()
);
create table if not exists donations (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id),
  charity_id uuid references charities(id), amount numeric not null,
  pay_status text default 'paid', created_at timestamptz default now()
);
create table if not exists payment_events (
  provider_event_id text primary key, type text, status text default 'processed', created_at timestamptz default now()
);
create table if not exists draw_audit_logs (
  id uuid primary key default gen_random_uuid(), actor uuid references profiles(id),
  action text not null, detail jsonb default '{}', created_at timestamptz default now()
);
create table if not exists platform_settings (
  key text primary key, value jsonb not null
);
insert into platform_settings(key,value) values ('prize_funding_pct','50'),('rollover_jackpot','0')
on conflict (key) do nothing;

-- Shared demo DB (cross-device): single JSON blob all devices read/write.
-- This is what makes a subscriber who registers/logs in on phone B
-- appear in admin on laptop A, with scores + draw evaluation.
-- Run this in Supabase SQL editor, then set VITE_SUPABASE_URL +
-- VITE_SUPABASE_ANON_KEY in Vercel/local .env and redeploy.
create table if not exists app_db (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
insert into app_db(id, data, updated_at) values (1, '{}', now())
on conflict (id) do nothing;
alter table app_db enable row level security;
drop policy if exists "demo open read" on app_db;
drop policy if exists "demo open write" on app_db;
create policy "demo open read" on app_db for select using (true);
create policy "demo open write" on app_db for insert with check (true);
create policy "demo open write" on app_db for update using (true);
-- NOTE: open policies are for this demo only. For production use
-- per-user RLS on the normalized tables above (profiles/scores/...) +
-- Supabase Auth, never a shared blob.

-- RLS: enable on exposed tables; policies enforce owner-or-admin.
alter table profiles enable row level security;
alter table scores enable row level security;
alter table winners enable row level security;
-- NOTE: add full policies in Supabase dashboard; rule of thumb:
-- subscribers: select/update own rows only; admins (service role / allowlist): full access.
-- Never trust a client-supplied role; set role via trusted provisioning only.
-- Rolling-5 enforcement: implement in a SECURITY DEFINER function/Edge Function
-- that inserts + deletes oldest in one transaction (see README).
-- Stripe: verify webhook signature, insert payment_events(provider_event_id) once
-- (idempotency), then activate subscription — never on success-page redirect.
