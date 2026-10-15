-- Execute somente depois de criar a conta da administradora em Authentication > Users.
-- Troque o texto de exemplo pelo e-mail dessa conta antes de executar.

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('gabriellessa24082004@gmail.com')
on conflict (user_id) do nothing;

select exists (
  select 1
  from public.admin_users as admins
  join auth.users as users on users.id = admins.user_id
  where lower(users.email) = lower('gabriellessa24082004@gmail.com')
) as admin_autorizado;
