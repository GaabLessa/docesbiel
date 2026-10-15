-- Regras iniciais para a área administrativa.
-- Execute no SQL Editor somente depois de confirmar a tabela public.products.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from public, anon, authenticated;

-- A função verifica uma lista administrada pelo proprietário no banco.
-- O navegador não pode se promover a administrador nem editar essa lista.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Apenas administradores autenticados podem gerenciar produtos.
revoke insert, update, delete on table public.products from anon;
grant select on table public.products to anon;
grant select, insert, update, delete on table public.products to authenticated;

create policy "Admins can view all products"
  on public.products for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can add products"
  on public.products for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update products"
  on public.products for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete products"
  on public.products for delete to authenticated
  using ((select public.is_admin()));
