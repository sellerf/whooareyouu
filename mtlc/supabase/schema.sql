-- MTLC - Schema Supabase
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)

-- Perfis de usuário
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  theme text not null default 'lua',
  is_admin boolean not null default false,
  plan_active boolean not null default false,
  plan_expires_at timestamptz,
  free_queries_used int not null default 0,
  free_queries_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pagamentos / assinaturas
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id text unique,
  external_ref text,
  months int not null default 1,
  amount_cents int not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Histórico de consultas (opcional / auditoria)
create table if not exists public.query_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text,
  file_type text,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_tx on public.payments(transaction_id);
create index if not exists idx_query_logs_user on public.query_logs(user_id);

-- Trigger: criar perfil ao registrar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, theme)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'theme', 'lua')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Helper admin (evita recursão RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.query_logs enable row level security;

-- Profiles: usuário lê/atualiza o próprio; admin lê todos
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Payments: usuário vê os próprios
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

-- Query logs
drop policy if exists "query_logs_select_own" on public.query_logs;
create policy "query_logs_select_own" on public.query_logs
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "query_logs_insert_own" on public.query_logs;
create policy "query_logs_insert_own" on public.query_logs
  for insert with check (auth.uid() = user_id);

-- Função RPC: consumir consulta (evita race conditions)
create or replace function public.consume_query(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
begin
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'Perfil não encontrado');
  end if;

  -- Plano ativo e não expirado
  if v_profile.plan_active and v_profile.plan_expires_at is not null
     and v_profile.plan_expires_at > now() then
    return json_build_object(
      'ok', true,
      'unlimited', true,
      'plan_expires_at', v_profile.plan_expires_at
    );
  end if;

  -- Reset diário da cota gratuita
  if v_profile.free_queries_date is distinct from v_today then
    update public.profiles
    set free_queries_used = 0, free_queries_date = v_today
    where id = p_user_id;
    v_profile.free_queries_used := 0;
  end if;

  if v_profile.free_queries_used >= 1 then
    return json_build_object(
      'ok', false,
      'error', 'Limite diário atingido. Assine o plano para consultas ilimitadas.',
      'remaining', 0
    );
  end if;

  update public.profiles
  set free_queries_used = free_queries_used + 1,
      free_queries_date = v_today
  where id = p_user_id;

  return json_build_object('ok', true, 'unlimited', false, 'remaining', 0);
end;
$$;

grant execute on function public.consume_query(uuid) to authenticated;
grant execute on function public.consume_query(uuid) to service_role;
