-- v21 — Seguridad (aplicada en producción el 2026-10-18)
-- Las funciones de saldo/stock eran ejecutables con la anon key → cualquiera
-- podía sumarse estrellas/puntos. Solo deben llamarse desde el server.
revoke execute on function public.credit_membership_balance(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.debit_membership_balance(uuid, integer, text)  from public, anon, authenticated;
revoke execute on function public.decrement_prize_stock(uuid)                     from public, anon, authenticated;
grant  execute on function public.credit_membership_balance(uuid, integer, text) to service_role;
grant  execute on function public.debit_membership_balance(uuid, integer, text)  to service_role;
grant  execute on function public.decrement_prize_stock(uuid)                     to service_role;
