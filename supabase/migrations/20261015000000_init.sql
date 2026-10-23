create extension if not exists pgcrypto;

create sequence if not exists public.inquiry_number_seq;
create sequence if not exists public.quotation_number_seq;

grant usage, select on sequence public.inquiry_number_seq, public.quotation_number_seq to service_role;
revoke all on sequence public.inquiry_number_seq, public.quotation_number_seq from anon, authenticated;

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('owner', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.company_settings (
  id integer primary key default 1 check (id = 1),
  legal_name text not null default 'PT Ambara Artha Globaltrade',
  registered_address text,
  registration_number text,
  tax_number text,
  telephone text,
  business_email text not null default 'hello@ambaratrade.com',
  notification_emails text[] not null default '{}',
  mail_ready boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.company_settings (id) values (1);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  summary text not null default '',
  description text not null default '',
  product_form text,
  species text,
  origin_country text,
  packaging text,
  minimum_order text,
  specifications jsonb not null default '[]'::jsonb,
  quality_summary text,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'paused', 'archived')),
  evidence_status text not null default 'pending'
    check (evidence_status in ('pending', 'verified', 'rejected')),
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_public_idx on public.products (published_at desc)
  where status = 'published';

create table public.supplier_evidence (
  product_id uuid primary key references public.products(id) on delete cascade,
  supplier_legal_name text,
  supplier_contact text,
  supplier_country text,
  specification_basis text,
  inspection_plan text,
  document_notes text,
  checklist jsonb not null default '{}'::jsonb,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  sort_order integer not null default 0
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  buyer_name text not null,
  company text not null,
  email text not null,
  whatsapp text,
  product_id uuid references public.products(id),
  product_name text not null,
  destination text not null,
  quantity text not null,
  requirements text not null default '',
  status text not null default 'new'
    check (status in ('new', 'assigned', 'contacted', 'quoted', 'closed')),
  assigned_to uuid references auth.users(id),
  privacy_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_created_idx on public.inquiries (created_at desc);
create index inquiries_status_idx on public.inquiries (status, created_at desc);

create table public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  note text,
  created_at timestamptz not null default now()
);
create index inquiry_events_inquiry_idx on public.inquiry_events (inquiry_id, created_at);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  inquiry_id uuid not null references public.inquiries(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id),
  version_number integer not null check (version_number >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved_unsent', 'sent', 'superseded', 'revoked')),
  document jsonb not null,
  currency char(3) not null,
  subtotal numeric(20,4) not null default 0,
  tax_amount numeric(20,4) not null default 0,
  total numeric(20,4) not null default 0,
  verification_token_hash char(64) unique,
  pdf_sha256 char(64),
  pdf_storage_path text unique,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quotation_id, version_number)
);
create index quotation_versions_quote_idx on public.quotation_versions
  (quotation_id, version_number desc);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('inquiry_ack', 'inquiry_alert', 'quotation')),
  related_id uuid not null,
  recipient text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  idempotency_key text not null unique,
  provider_id text,
  last_error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_deliveries_status_idx on public.email_deliveries (status, created_at);

create table public.inquiry_rate_limits (
  bucket text primary key,
  count integer not null,
  window_start timestamptz not null
);

create function public.next_inquiry_reference() returns text
language sql volatile
as $$
  select 'AGT-I-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' ||
    lpad(nextval('public.inquiry_number_seq')::text, 6, '0');
$$;

create function public.next_quotation_reference() returns text
language sql volatile
as $$
  select 'AGT-Q-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' ||
    lpad(nextval('public.quotation_number_seq')::text, 6, '0');
$$;

create function public.allow_inquiry_submission(p_bucket text) returns boolean
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.inquiry_rate_limits (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update
  set count = case
    when public.inquiry_rate_limits.window_start < now() - interval '1 hour'
      then 1
    else public.inquiry_rate_limits.count + 1
  end,
  window_start = case
    when public.inquiry_rate_limits.window_start < now() - interval '1 hour'
      then now()
    else public.inquiry_rate_limits.window_start
  end
  returning count into new_count;
  return new_count <= 5;
end;
$$;

revoke all on function public.next_inquiry_reference() from public, anon, authenticated;
revoke all on function public.next_quotation_reference() from public, anon, authenticated;
revoke all on function public.allow_inquiry_submission(text) from public, anon, authenticated;
grant execute on function public.next_inquiry_reference() to service_role;
grant execute on function public.next_quotation_reference() to service_role;
grant execute on function public.allow_inquiry_submission(text) to service_role;

alter table public.staff_profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.products enable row level security;
alter table public.supplier_evidence enable row level security;
alter table public.evidence_files enable row level security;
alter table public.product_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_events enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_versions enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.inquiry_rate_limits enable row level security;

create policy "published products are public" on public.products
  for select to anon, authenticated using (status = 'published');
create policy "published product images are public" on public.product_images
  for select to anon, authenticated using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id and products.status = 'published'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('supplier-evidence', 'supplier-evidence', false, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('quotation-pdfs', 'quotation-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
