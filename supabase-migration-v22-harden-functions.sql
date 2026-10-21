-- v22 — Endurecer funciones SECURITY DEFINER (hallazgos del advisor de Supabase, 2026-10-21)
-- NO está aplicada todavía. Revisar y correr en el SQL editor de Supabase.
-- Todo es reversible (GRANT ... / ALTER FUNCTION ... RESET search_path).

-- 1) get_member_progress: SECURITY DEFINER sin uso en el código y ejecutable por
--    anon/authenticated con cualquier p_user_id → cualquiera podía consultar visitas ajenas.
REVOKE EXECUTE ON FUNCTION public.get_member_progress(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 2) handle_new_user: es una función de trigger (auth.users); no debe ser llamable por /rest/v1/rpc.
--    Los triggers no necesitan EXECUTE del usuario que dispara el evento.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3) search_path fijo en funciones (evita secuestro de nombres de objeto).
ALTER FUNCTION public.mark_expired_promotions()                      SET search_path = public;
ALTER FUNCTION public.debit_membership_balance(uuid, integer, text)  SET search_path = public;
ALTER FUNCTION public.credit_membership_balance(uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.decrement_prize_stock(uuid)                    SET search_path = public;
ALTER FUNCTION public.get_member_progress(uuid, uuid)                SET search_path = public;
-- check_membership_limit: revisar su firma antes de fijarla (es función de trigger):
-- ALTER FUNCTION public.check_membership_limit() SET search_path = public;
