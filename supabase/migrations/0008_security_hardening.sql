-- SindCopilot — hardening de funções públicas
-- Mantém triggers/RPCs funcionais, mas remove execução direta indevida e fixa search_path.

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
grant execute on function public.handle_new_auth_user() to service_role;

alter function public.set_updated_at() set search_path = public;
alter function public.match_document_chunks(vector, uuid, bigint, integer) set search_path = public;
