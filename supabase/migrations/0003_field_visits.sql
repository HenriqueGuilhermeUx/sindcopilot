-- Modo Visita / SindCopilot Mobile

create table if not exists public.field_visits (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  condominium_id bigint not null references public.condominiums(id) on delete cascade,
  performed_by uuid references public.users(id) on delete set null,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  summary text,
  total_items integer not null default 0 check (total_items >= 0),
  ok_count integer not null default 0 check (ok_count >= 0),
  attention_count integer not null default 0 check (attention_count >= 0),
  urgent_count integer not null default 0 check (urgent_count >= 0),
  pending_count integer not null default 0 check (pending_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_visit_items (
  id bigserial primary key,
  visit_id bigint not null references public.field_visits(id) on delete cascade,
  client_id text not null,
  area text not null,
  title text not null,
  status text not null check (status in ('pending', 'ok', 'attention', 'urgent')),
  notes text,
  due_date date,
  document_id bigint references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (visit_id, client_id)
);

create index if not exists field_visits_user_completed_idx
  on public.field_visits(user_id, completed_at desc);
create index if not exists field_visits_condominium_idx
  on public.field_visits(condominium_id, completed_at desc);
create index if not exists field_visit_items_visit_idx
  on public.field_visit_items(visit_id);
create index if not exists field_visit_items_status_idx
  on public.field_visit_items(status);

create or replace trigger field_visits_updated_at
  before update on public.field_visits
  for each row execute function public.set_updated_at();

alter table public.field_visits enable row level security;
alter table public.field_visit_items enable row level security;

comment on table public.field_visits is 'Visitas e vistorias realizadas pelo modo de campo do SindCopilot';
comment on table public.field_visit_items is 'Itens de checklist, ocorrências, fotos e prazos de cada visita';
