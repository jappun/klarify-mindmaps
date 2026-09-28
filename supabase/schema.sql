-- Klarify mindmaps demo schema (SPEC §11).
-- Run once in the Supabase SQL editor. All access goes through the server with the service-role key,
-- so RLS is enabled with no policies: the anon key can't read or write anything.

create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  session_number int not null,
  session_date date not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  failed_step text null check (failed_step in ('extract', 'merge', 'reflections')),
  raw_transcript text not null,
  utterances jsonb not null,          -- [{index, timestamp, timestamp_label, speaker, text}]
  client_speaker text null,           -- speaker label for the client; quotes must come from them
  extraction jsonb null,              -- Step A output, saved for resume/debug
  created_at timestamptz not null default now(),
  unique (client_id, session_number)
);

create table if not exists nodes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null check (type in ('narrative', 'belief', 'strategy', 'need', 'value')),
  label text not null,
  description text not null,
  need_category text null,
  primary_narrative_id uuid null references nodes(id) on delete set null,
  first_session_id uuid not null references sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists node_occurrences (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references nodes(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  summary text[] not null default '{}',
  quotes jsonb not null default '[]',  -- [{utterance_index, text}]
  unique (node_id, session_id)
);

create table if not exists edges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  source_node_id uuid not null references nodes(id) on delete cascade,
  target_node_id uuid not null references nodes(id) on delete cascade,
  explanation text not null,
  session_ids uuid[] not null default '{}'
);

create table if not exists reflection_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  text text not null,
  source text not null check (source in ('ai', 'therapist')),
  created_at timestamptz not null default now()
);

-- Abuse guard for the public demo: one row per upload, used for a per-IP rate limit.
create table if not exists upload_log (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_client_idx on sessions (client_id, session_number);
create index if not exists nodes_client_idx on nodes (client_id);
create index if not exists occurrences_session_idx on node_occurrences (session_id);
create index if not exists edges_client_idx on edges (client_id);
create index if not exists reflections_session_idx on reflection_questions (session_id);
create index if not exists upload_log_ip_idx on upload_log (ip, created_at);

alter table clients enable row level security;
alter table sessions enable row level security;
alter table nodes enable row level security;
alter table node_occurrences enable row level security;
alter table edges enable row level security;
alter table reflection_questions enable row level security;
alter table upload_log enable row level security;
