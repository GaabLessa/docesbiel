-- Tabela inicial do catálogo da Doce Encanto.
-- Execute este arquivo uma vez no SQL Editor do seu projeto Supabase.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null check (category in ('bolos', 'doces')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Ative RLS antes de permitir que o site consulte a tabela.
alter table public.products enable row level security;

-- O catálogo público só precisa ler os produtos ativos.
revoke insert, update, delete, truncate, references, trigger
  on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

create index if not exists products_active_category_order_idx
  on public.products (category, sort_order)
  where is_active = true;
