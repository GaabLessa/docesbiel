-- Configura o bucket público das fotos de produtos.
-- Qualquer visitante pode visualizar as imagens pelo endereço público;
-- somente usuários autorizados como administradores podem enviar arquivos.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O Storage precisa conseguir ler os metadados do arquivo enviado
-- para devolver a resposta do upload ao navegador.
create policy "Admins can read product image metadata"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
