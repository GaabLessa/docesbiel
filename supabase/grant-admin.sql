-- Execute somente depois de criar a conta da administradora em Authentication > Users.
-- Troque o texto de exemplo pelo e-mail dessa conta antes de executar.

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('COLE_O_EMAIL_DA_ADMINISTRADORA_AQUI')
on conflict (user_id) do nothing;

select exists (
  select 1
  from public.admin_users as admins
  join auth.users as users on users.id = admins.user_id
  where lower(users.email) = lower('COLE_O_EMAIL_DA_ADMINISTRADORA_AQUI')
) as admin_autorizado;
