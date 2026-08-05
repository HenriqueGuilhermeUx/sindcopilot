-- Alinha novos cadastros à Política de Privacidade versão 2.0.
-- Consentimentos históricos permanecem registrados com a versão aceita na época.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    terms_accepted_at,
    lgpd_consent_at,
    lgpd_consent_version
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    case when new.raw_user_meta_data->>'accepted_terms' = 'true' then now() else null end,
    case when new.raw_user_meta_data->>'accepted_terms' = 'true' then now() else null end,
    case
      when new.raw_user_meta_data->>'accepted_terms' = 'true'
      then coalesce(new.raw_user_meta_data->>'lgpd_version', '2.0')
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
