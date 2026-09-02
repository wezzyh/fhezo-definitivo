-- Bloco 4: tabela "integracoes" — guarda tokens OAuth de integrações
-- externas (hoje só o Melhor Envio) de forma persistente, já que o token
-- expira e precisa ser renovado em runtime (variável de ambiente não serve
-- para isso).

create table if not exists integracoes (
  id uuid primary key default gen_random_uuid(),
  provedor text not null unique,
  access_token text,
  refresh_token text,
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table integracoes is 'Tokens OAuth de integrações externas (ex.: Melhor Envio), renovados em runtime.';
comment on column integracoes.provedor is 'Identificador da integração, ex.: ''melhor_envio''.';

-- Mantém "updated_at" sempre atualizado em cada UPDATE.
create or replace function integracoes_atualizar_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_integracoes_updated_at on integracoes;
create trigger trigger_integracoes_updated_at
  before update on integracoes
  for each row
  execute function integracoes_atualizar_updated_at();

-- RLS: só o admin autenticado pode ler/escrever nesta tabela.
--
-- Hoje existe um único usuário administrador (ver TODO em src/proxy.ts),
-- então "authenticated" equivale a "admin". Quando houver múltiplos
-- usuários autenticados que não sejam admin, trocar `using (true)` por uma
-- checagem de role.
--
-- O cálculo de frete no checkout público (src/lib/frete/melhorenvio.ts) NÃO
-- passa por essas políticas: ele usa a service_role key (que ignora RLS)
-- porque precisa ler/renovar o token mesmo quando quem está comprando não
-- é o admin autenticado. Ver src/lib/supabase/admin.ts.
alter table integracoes enable row level security;

drop policy if exists "Admin pode ler integracoes" on integracoes;
create policy "Admin pode ler integracoes"
  on integracoes for select
  to authenticated
  using (true);

drop policy if exists "Admin pode inserir integracoes" on integracoes;
create policy "Admin pode inserir integracoes"
  on integracoes for insert
  to authenticated
  with check (true);

drop policy if exists "Admin pode atualizar integracoes" on integracoes;
create policy "Admin pode atualizar integracoes"
  on integracoes for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin pode excluir integracoes" on integracoes;
create policy "Admin pode excluir integracoes"
  on integracoes for delete
  to authenticated
  using (true);
