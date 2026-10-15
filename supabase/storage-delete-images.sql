-- Permite que somente administradores removam imagens de produtos.
-- Execute uma única vez no SQL Editor (Editor SQL).
create policy "Admins can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
