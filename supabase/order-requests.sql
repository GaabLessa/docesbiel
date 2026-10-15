-- Solicitações de encomenda: visitantes podem apenas inserir novos pedidos.
-- Somente administradores autorizados podem consultar os dados dos clientes
-- e atualizar o status. Pode executar para instalar ou atualizar a configuração.

create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(customer_name) between 1 and 100),
  customer_phone text not null check (length(customer_phone) between 7 and 30),
  customer_email text check (customer_email is null or length(customer_email) <= 254),
  product_id uuid references public.products (id) on delete set null,
  product_name text not null check (length(product_name) between 1 and 100),
  quantity integer not null check (quantity between 1 and 100),
  preferred_date date not null,
  preferred_time time,
  delivery_method text not null default 'pickup'
    check (delivery_method in ('pickup', 'delivery')),
  delivery_postal_code text check (delivery_postal_code is null or length(delivery_postal_code) <= 9),
  delivery_city text check (delivery_city is null or length(delivery_city) <= 100),
  delivery_neighborhood text check (delivery_neighborhood is null or length(delivery_neighborhood) <= 100),
  delivery_address text check (delivery_address is null or length(delivery_address) <= 200),
  delivery_number text check (delivery_number is null or length(delivery_number) <= 30),
  delivery_complement text check (delivery_complement is null or length(delivery_complement) <= 100),
  delivery_fee_cents integer check (delivery_fee_cents is null or delivery_fee_cents >= 0),
  notes text check (notes is null or length(notes) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Também atualiza com segurança uma tabela de pedidos que já tenha sido criada
-- pela versão inicial deste arquivo.
alter table public.order_requests
  add column if not exists delivery_method text not null default 'pickup'
    check (delivery_method in ('pickup', 'delivery')),
  add column if not exists delivery_postal_code text check (delivery_postal_code is null or length(delivery_postal_code) <= 9),
  add column if not exists delivery_city text check (delivery_city is null or length(delivery_city) <= 100),
  add column if not exists delivery_neighborhood text check (delivery_neighborhood is null or length(delivery_neighborhood) <= 100),
  add column if not exists delivery_address text check (delivery_address is null or length(delivery_address) <= 200),
  add column if not exists delivery_number text check (delivery_number is null or length(delivery_number) <= 30),
  add column if not exists delivery_complement text check (delivery_complement is null or length(delivery_complement) <= 100),
  add column if not exists delivery_fee_cents integer check (delivery_fee_cents is null or delivery_fee_cents >= 0);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  postal_code_start text not null check (postal_code_start ~ '^[0-9]{8}$'),
  postal_code_end text not null check (postal_code_end ~ '^[0-9]{8}$'),
  fee_cents integer not null check (fee_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (postal_code_start::integer <= postal_code_end::integer)
);

alter table public.delivery_zones enable row level security;
revoke all on table public.delivery_zones from public, anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'delivery_zones' and policyname = 'Visitors can view active delivery zones') then
    create policy "Visitors can view active delivery zones"
      on public.delivery_zones for select to anon, authenticated
      using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'delivery_zones' and policyname = 'Admins can view all delivery zones') then
    create policy "Admins can view all delivery zones"
      on public.delivery_zones for select to authenticated
      using ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'delivery_zones' and policyname = 'Admins can add delivery zones') then
    create policy "Admins can add delivery zones"
      on public.delivery_zones for insert to authenticated
      with check ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'delivery_zones' and policyname = 'Admins can edit delivery zones') then
    create policy "Admins can edit delivery zones"
      on public.delivery_zones for update to authenticated
      using ((select public.is_admin()))
      with check ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'delivery_zones' and policyname = 'Admins can delete delivery zones') then
    create policy "Admins can delete delivery zones"
      on public.delivery_zones for delete to authenticated
      using ((select public.is_admin()));
  end if;
end
$$;

-- O banco decide a tarifa pela faixa de CEP; não confia no valor enviado pelo navegador.
create or replace function public.set_order_delivery_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_cep text;
begin
  if new.delivery_method = 'pickup' then
    new.delivery_fee_cents := 0;
    new.delivery_postal_code := null;
    new.delivery_city := null;
    new.delivery_neighborhood := null;
    new.delivery_address := null;
    new.delivery_number := null;
    new.delivery_complement := null;
    return new;
  end if;

  clean_cep := regexp_replace(coalesce(new.delivery_postal_code, ''), '[^0-9]', '', 'g');
  if length(clean_cep) <> 8
    or coalesce(trim(new.delivery_city), '') = ''
    or coalesce(trim(new.delivery_neighborhood), '') = ''
    or coalesce(trim(new.delivery_address), '') = ''
    or coalesce(trim(new.delivery_number), '') = '' then
    raise exception 'Informe um CEP e um endereço de entrega completos.';
  end if;
  new.delivery_postal_code := clean_cep;

  select zone.fee_cents into new.delivery_fee_cents
  from public.delivery_zones as zone
  where zone.is_active
    and clean_cep::integer between zone.postal_code_start::integer and zone.postal_code_end::integer
  order by (zone.postal_code_end::integer - zone.postal_code_start::integer)
  limit 1;

  return new;
end;
$$;

revoke all on function public.set_order_delivery_fee() from public, anon, authenticated;
drop trigger if exists set_order_delivery_fee_trigger on public.order_requests;
create trigger set_order_delivery_fee_trigger
  before insert or update of delivery_method, delivery_postal_code on public.order_requests
  for each row execute function public.set_order_delivery_fee();

alter table public.order_requests enable row level security;
revoke all on table public.order_requests from public, anon, authenticated;

grant insert (
  customer_name, customer_phone, customer_email, product_id, product_name,
  quantity, preferred_date, preferred_time, delivery_method, delivery_postal_code,
  delivery_city, delivery_neighborhood, delivery_address, delivery_number,
  delivery_complement, delivery_fee_cents, notes
) on public.order_requests to anon, authenticated;
grant select on public.order_requests to authenticated;
grant update (status) on public.order_requests to authenticated;
grant update (
  customer_name, customer_phone, customer_email, product_name, quantity,
  preferred_date, preferred_time, delivery_method, delivery_postal_code,
  delivery_city, delivery_neighborhood, delivery_address, delivery_number,
  delivery_complement, notes
) on public.order_requests to authenticated;
grant delete on public.order_requests to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_requests' and policyname = 'Visitors can submit order requests') then
    create policy "Visitors can submit order requests"
      on public.order_requests for insert to anon, authenticated
      with check (status = 'pending');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_requests' and policyname = 'Admins can view order requests') then
    create policy "Admins can view order requests"
      on public.order_requests for select to authenticated
      using ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_requests' and policyname = 'Admins can update order request status') then
    create policy "Admins can update order request status"
      on public.order_requests for update to authenticated
      using ((select public.is_admin()))
      with check ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_requests' and policyname = 'Admins can delete order requests') then
    create policy "Admins can delete order requests"
      on public.order_requests for delete to authenticated
      using ((select public.is_admin()));
  end if;
end
$$;

create index if not exists order_requests_created_at_idx
  on public.order_requests (created_at desc);
