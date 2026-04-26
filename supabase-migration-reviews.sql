-- Tabla de reseñas
create table if not exists reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  commerce_id   uuid not null references commerces(id) on delete cascade,
  membership_id uuid references memberships(id) on delete set null,
  rating        smallint not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique(user_id, commerce_id)
);

-- Índices
create index if not exists reviews_commerce_id_idx on reviews(commerce_id);
create index if not exists reviews_user_id_idx     on reviews(user_id);

-- RLS
alter table reviews enable row level security;

-- Cualquiera puede leer reseñas
create policy "reviews_select_public" on reviews
  for select using (true);

-- Solo el dueño puede insertar/actualizar su reseña
create policy "reviews_insert_own" on reviews
  for insert with check (auth.uid() = user_id);

create policy "reviews_update_own" on reviews
  for update using (auth.uid() = user_id);

create policy "reviews_delete_own" on reviews
  for delete using (auth.uid() = user_id);
