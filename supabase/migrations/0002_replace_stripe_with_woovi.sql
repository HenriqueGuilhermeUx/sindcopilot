-- Migração segura para instalações que executaram a versão anterior.
alter table public.users add column if not exists woovi_subscription_id text;
alter table public.users add column if not exists woovi_status text;
alter table public.users add column if not exists woovi_current_period_end timestamptz;

create unique index if not exists users_woovi_subscription_id_idx
  on public.users(woovi_subscription_id)
  where woovi_subscription_id is not null;

create table if not exists public.woovi_events (
  id text primary key,
  event_type text not null,
  payload jsonb,
  status text not null default 'processing' check (status in ('processing','processed','failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.woovi_events enable row level security;

alter table public.users drop column if exists stripe_customer_id;
alter table public.users drop column if exists stripe_subscription_id;
alter table public.users drop column if exists stripe_status;
alter table public.users drop column if exists stripe_current_period_end;
drop table if exists public.stripe_events;
