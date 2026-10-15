-- Produtos de demonstração para preencher o catálogo inicial.
-- Os preços ficam nulos até você definir os preços reais da confeitaria.

create unique index if not exists products_name_unique_idx
  on public.products (name);

insert into public.products (name, description, category, price_cents, image_url, sort_order)
values
  (
    'Bolo de brigadeiro',
    'Massa de chocolate e brigadeiro cremoso',
    'bolos',
    null,
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    1
  ),
  (
    'Bolo Ninho com morango',
    'Creme suave, morangos e massa fofinha',
    'bolos',
    null,
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80',
    2
  ),
  (
    'Docinhos de festa',
    'Brigadeiro, beijinho e sabores da casa',
    'doces',
    null,
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
    3
  ),
  (
    'Cupcakes decorados',
    'Uma porção de carinho em cada unidade',
    'doces',
    null,
    'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=800&q=80',
    4
  ),
  (
    'Brownie artesanal',
    'Casquinha crocante e centro macio',
    'doces',
    null,
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    5
  ),
  (
    'Bolo caseiro',
    'Receita simples para acompanhar o café',
    'bolos',
    null,
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
    6
  )
on conflict (name) do nothing;
