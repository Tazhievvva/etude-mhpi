-- Run this script in Supabase SQL Editor.
create table if not exists public.etude_votes (
  issue_id text not null,
  device_id uuid not null,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (issue_id, device_id)
);

alter table public.etude_votes enable row level security;

-- No anon/authenticated policies are created. Only the server-side
-- Netlify Function uses the Supabase service_role key.
create index if not exists etude_votes_issue_vote_idx
  on public.etude_votes (issue_id, vote);
