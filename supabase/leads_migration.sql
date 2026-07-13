-- Leads module migration
-- Run this once in the Supabase SQL editor

create table if not exists leads (
  id bigint generated always as identity primary key,
  name text not null,
  school_name text,
  city text,
  phone text,
  email text,
  source text not null default 'organic', -- 'mailing' | 'organic' | 'referral' | 'returning'
  referrer_name text,
  status text not null default 'open', -- 'open' | 'won' | 'lost'
  lost_reason text,
  notes text,
  converted_project_id bigint references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_steps (
  id bigint generated always as identity primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  step_key text not null,
  done boolean not null default false,
  done_at timestamptz,
  client_days numeric,
  notes text,
  unique(lead_id, step_key)
);

create table if not exists lead_worker_times (
  id bigint generated always as identity primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  step_key text not null,
  worker_id bigint not null references workers(id) on delete cascade,
  duration_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique(lead_id, step_key, worker_id)
);

-- RLS
alter table leads enable row level security;
alter table lead_steps enable row level security;
alter table lead_worker_times enable row level security;

create policy "auth_all_leads" on leads for all using (auth.role() = 'authenticated');
create policy "auth_all_lead_steps" on lead_steps for all using (auth.role() = 'authenticated');
create policy "auth_all_lead_times" on lead_worker_times for all using (auth.role() = 'authenticated');
