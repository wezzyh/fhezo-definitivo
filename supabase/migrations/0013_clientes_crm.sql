-- CRM B2B enxuto, como extensão de "clientes" — NÃO um sistema de CRM
-- completo à parte (sem pipeline de vendas, sem "negócios/oportunidades",
-- sem timeline de interações).
--
-- ---------------------------------------------------------------------------
-- Decisão de arquitetura: tabela separada "clientes_crm" (1:1 com
-- "clientes"), em vez de colunas direto em "clientes"
-- ---------------------------------------------------------------------------
-- "clientes" é escrita pelo checkout público via service_role (ver
-- src/app/(site)/checkout/actions.ts) — é a tabela de identidade/dados de
-- cobrança do cliente, lida por um fluxo que não tem nada a ver com CRM.
-- RLS no Postgres é por LINHA, não por coluna: se "proxima_acao",
-- "observacoes" etc. fossem colunas de "clientes" e um dia se criasse um
-- portal do cliente (com auth_user_id + política "cliente vê a própria
-- linha"), essas colunas internas vazariam automaticamente pro cliente
-- final junto com nome/documento/telefone — um vazamento silencioso, sem
-- que ninguém tivesse tocado em código de CRM.
--
-- Uma tabela própria isola esse risco de vez: "clientes_crm" nunca recebe
-- NENHUMA política para "anon" (nem hoje, nem por engano no futuro) —
-- mesmo padrão já usado para "integracoes"/"eventos_integracao" (dado
-- interno, zero exposição pública). Também mantém "clientes" enxuta e
-- focada em checkout, o mesmo raciocínio que já levou a tirar "categoria"
-- de "produtos" e criar a tabela "categorias" própria (migração 0009).
create table if not exists clientes_crm (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  nome_comprador text,
  segmento text,
  proxima_acao text,
  proxima_acao_data date,
  valor_potencial numeric(12, 2),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table clientes_crm is 'Dados de CRM B2B enxuto por cliente (1:1 com clientes) — contato principal, segmento, próxima ação, valor potencial, observações. "Última compra"/"último contato" são calculados a partir de pedidos, não guardados aqui.';
comment on column clientes_crm.nome_comprador is 'Contato principal dentro da empresa (relevante sobretudo para clientes PJ).';
comment on column clientes_crm.proxima_acao is 'Texto livre, ex.: "Ligar dia 15 para renovar cotação".';
comment on column clientes_crm.proxima_acao_data is 'Data da próxima ação, opcional. Usada para destacar ações atrasadas/próximas na listagem e no dashboard.';
comment on column clientes_crm.valor_potencial is 'Estimativa de quanto esse cliente pode representar — número livre digitado pelo admin, não calculado.';

-- Acelera o item "Clientes com ação atrasada" do dashboard (Central de
-- ações) e o filtro de mesma finalidade em /admin/clientes.
create index if not exists idx_clientes_crm_proxima_acao_data
  on clientes_crm (proxima_acao_data)
  where proxima_acao_data is not null;

alter table clientes_crm enable row level security;

-- Só o admin autenticado. Sem política nenhuma para "anon" — leitura E
-- escrita ficam de propósito restritas a "authenticated", diferente de
-- produtos/menu/home, que são conteúdo público.
drop policy if exists "Admin autenticado ve dados de CRM" on clientes_crm;
create policy "Admin autenticado ve dados de CRM"
  on clientes_crm for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado grava dados de CRM" on clientes_crm;
create policy "Admin autenticado grava dados de CRM"
  on clientes_crm for insert
  to authenticated
  with check (true);

drop policy if exists "Admin autenticado atualiza dados de CRM" on clientes_crm;
create policy "Admin autenticado atualiza dados de CRM"
  on clientes_crm for update
  to authenticated
  using (true)
  with check (true);

-- Sem política de DELETE: a linha de CRM de um cliente só some via
-- "on delete cascade" se o próprio cliente for excluído (hoje não há UI
-- nem código que exclua "clientes").

-- ---------------------------------------------------------------------------
-- View "clientes_crm_resumo": junta clientes + clientes_crm + a data do
-- pedido mais recente (base de "última compra"/"último contato" — as
-- duas usam a mesma data por enquanto, já que não existe um sistema de
-- registro de contatos separado; ver HANDOFF.md).
-- ---------------------------------------------------------------------------
-- "security_invoker = true" (Postgres 15+) faz a view rodar com os
-- privilégios/RLS de quem consulta, não do dono da view — sem isso, as
-- políticas de RLS de "clientes"/"clientes_crm"/"pedidos" seriam
-- ignoradas e a view abriria uma porta lateral pra ler os dados sem RLS.
-- Mesma razão pela qual publicar_conteudo_site/publicar_banner (migração
-- 0012) usam "security invoker".
create or replace view clientes_crm_resumo
with (security_invoker = true) as
select
  c.id as cliente_id,
  c.tipo,
  c.nome,
  c.documento,
  c.email,
  c.telefone,
  c.created_at as cliente_criado_em,
  cc.nome_comprador,
  cc.segmento,
  cc.proxima_acao,
  cc.proxima_acao_data,
  cc.valor_potencial,
  cc.observacoes,
  cc.updated_at as crm_atualizado_em,
  p.ultima_compra_em
from clientes c
left join clientes_crm cc on cc.cliente_id = c.id
left join lateral (
  select max(pe.created_at) as ultima_compra_em
  from pedidos pe
  where pe.cliente_id = c.id
) p on true;

comment on view clientes_crm_resumo is 'Leitura combinada para /admin/clientes: dado de identidade (clientes) + CRM (clientes_crm) + última compra (MAX(pedidos.created_at)). "security_invoker" garante que a RLS das tabelas de base continua valendo.';
