-- v20 — Facturación Mercado Pago (aplicada en producción el 2026-10-17)
-- Tablas: checkout_intents, subscriptions, payments + commerce_activity.metadata
-- Ver app/api/webhooks/mercadopago/route.js y app/api/billing/checkout-intent/route.js

alter table public.commerce_activity add column if not exists metadata jsonb;

create table if not exists public.checkout_intents (
  id          uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references public.commerces(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  plan        text not null check (plan in ('starter','pro')),
  matched_preapproval_id text,
  created_at  timestamptz not null default now()
);
create index if not exists checkout_intents_recent_idx on public.checkout_intents (plan, created_at desc);

create table if not exists public.subscriptions (
  mp_preapproval_id  text primary key,
  commerce_id        uuid references public.commerces(id) on delete set null,
  plan               text,
  status             text,
  amount             numeric,
  payer_email        text,
  external_reference text,
  matched_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists subscriptions_commerce_idx on public.subscriptions (commerce_id);

create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  mp_payment_id     text unique not null,
  mp_preapproval_id text,
  commerce_id       uuid references public.commerces(id) on delete set null,
  plan              text,
  amount            numeric,
  status            text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists payments_commerce_idx on public.payments (commerce_id, paid_at desc);

alter table public.checkout_intents enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.payments         enable row level security;

create policy "owner reads own subscriptions" on public.subscriptions for select to authenticated
  using (exists (select 1 from public.commerces c where c.id = subscriptions.commerce_id and c.owner_id = auth.uid()));
create policy "owner reads own payments" on public.payments for select to authenticated
  using (exists (select 1 from public.commerces c where c.id = payments.commerce_id and c.owner_id = auth.uid()));
