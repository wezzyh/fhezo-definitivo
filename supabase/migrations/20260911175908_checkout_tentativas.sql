-- Uma chave persistente por checkout impede duas execuções simultâneas.
-- Sem política pública: somente o backend com service_role acessa.
create table if not exists public.checkout_tentativas (
  id uuid primary key,
  estado text not null default 'processando' check (estado in ('processando', 'concluido', 'revisao')),
  resultado jsonb,
  created_at timestamptz not null default now()
);
alter table public.checkout_tentativas enable row level security;
revoke all on public.checkout_tentativas from anon, authenticated;
grant select, insert, update, delete on public.checkout_tentativas to service_role;
comment on table public.checkout_tentativas is 'Idempotência de checkout. Nunca expirar automaticamente uma tentativa com cobrança incerta.';
