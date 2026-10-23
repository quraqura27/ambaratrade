create table public.quotation_events (
  id uuid primary key default gen_random_uuid(),
  quotation_version_id uuid not null references public.quotation_versions(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  note text,
  created_at timestamptz not null default now()
);
create index quotation_events_version_idx on public.quotation_events (quotation_version_id,created_at);
alter table public.quotation_events enable row level security;
