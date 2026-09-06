-- Pré-requisito de segurança para o login de cliente (Bloco de autenticação
-- de cliente): até aqui, TODA política de RLS "para authenticated" deste
-- projeto assumia implicitamente "authenticated == o único admin" — ver o
-- TODO em src/proxy.ts ("quando houver mais de um administrador, checar
-- aqui também a permissão"). No momento em que um cliente ganha conta
-- própria no MESMO projeto Supabase Auth, ele também vira "authenticated",
-- e sem esta migração passaria a enxergar (e em alguns casos escrever)
-- produtos/marcas/categorias/tickets/clientes_crm/conteudo_site/banners/
-- o bucket admin-imagens — e o /admin/proxy.ts deixaria ele entrar no
-- painel inteiro. Esta migração cria uma distinção real entre "admin" e
-- "cliente autenticado" e reaplica isso em cada política que antes usava
-- `using (true)`/`with check (true)` só porque só existia o admin.

-- ---------------------------------------------------------------------------
-- 1. Tabela "admins" + função is_admin()
-- ---------------------------------------------------------------------------
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table admins is 'Lista de usuários do Supabase Auth que são administradores (com acesso ao /admin e às tabelas internas). Fora daqui, um usuário autenticado é só um cliente comum. Adicionar um novo admin = inserir o id aqui manualmente pelo SQL Editor.';

-- RLS habilitada e SEM NENHUMA política: ninguém lê/grava "admins" via
-- PostgREST (nem admin, nem cliente) — só a função is_admin() abaixo, que
-- roda com "security definer" e por isso enxerga a tabela independente de
-- RLS. Consultar/alterar a lista de admins continua possível pelo
-- SQL Editor (roda como owner do banco, ignora RLS).
alter table admins enable row level security;

-- Seed: o único usuário que existe no projeto hoje é o admin atual — vira
-- o primeiro (e único, por enquanto) registro de "admins". Só faz sentido
-- rodar isto ANTES do primeiro cliente se cadastrar (é exatamente o que
-- está acontecendo: esta migração roda antes de existir qualquer tela de
-- cadastro de cliente). Se este projeto já tiver mais de um usuário no
-- Supabase Auth quando for rodar esta migração, ajuste manualmente depois
-- (delete de "admins" quem não for admin, ou insira à mão quem for).
insert into admins (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from admins where id = auth.uid());
$$;

comment on function is_admin() is 'true se o usuário autenticado atual (auth.uid()) está na tabela admins. security definer: roda ignorando a RLS de "admins" (que não tem nenhuma política), então qualquer política de RLS pode chamar is_admin() sem precisar de acesso direto à tabela.';

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Reaplica "using (true)"/"with check (true)" como "using (is_admin())"
--    em todas as políticas "to authenticated" criadas por migrations
--    anteriores (mesmo nome de política — só troca a condição).
-- ---------------------------------------------------------------------------

-- integracoes (migração 0002)
drop policy if exists "Admin pode ler integracoes" on integracoes;
create policy "Admin pode ler integracoes" on integracoes for select to authenticated using (is_admin());
drop policy if exists "Admin pode inserir integracoes" on integracoes;
create policy "Admin pode inserir integracoes" on integracoes for insert to authenticated with check (is_admin());
drop policy if exists "Admin pode atualizar integracoes" on integracoes;
create policy "Admin pode atualizar integracoes" on integracoes for update to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "Admin pode excluir integracoes" on integracoes;
create policy "Admin pode excluir integracoes" on integracoes for delete to authenticated using (is_admin());

-- produtos: a política "Admin autenticado ve todos os produtos" (a única
-- criada por migração, em 0006) é tratada junto com o restante das
-- políticas de produtos na seção 4 abaixo (descoberta dinâmica via
-- pg_policies) — produtos tem outras políticas "to authenticated" que
-- existiam antes de haver controle de migration, então todas são
-- substituídas juntas por uma única política consolidada.

-- marcas (migração 0009)
drop policy if exists "Admin autenticado ve todas as marcas" on marcas;
create policy "Admin autenticado ve todas as marcas" on marcas for select to authenticated using (is_admin());
drop policy if exists "Admin pode inserir marcas" on marcas;
create policy "Admin pode inserir marcas" on marcas for insert to authenticated with check (is_admin());
drop policy if exists "Admin pode atualizar marcas" on marcas;
create policy "Admin pode atualizar marcas" on marcas for update to authenticated using (is_admin()) with check (is_admin());
-- Ver comentário em "Cliente autenticado ve produtos ativos" (seção 4) sobre por que isto é necessário.
create policy "Cliente autenticado ve marcas ativas" on marcas for select to authenticated using (ativo = true);

-- categorias (migração 0009)
drop policy if exists "Admin autenticado ve todas as categorias" on categorias;
create policy "Admin autenticado ve todas as categorias" on categorias for select to authenticated using (is_admin());
drop policy if exists "Admin pode inserir categorias" on categorias;
create policy "Admin pode inserir categorias" on categorias for insert to authenticated with check (is_admin());
drop policy if exists "Admin pode atualizar categorias" on categorias;
create policy "Admin pode atualizar categorias" on categorias for update to authenticated using (is_admin()) with check (is_admin());
-- Ver comentário em "Cliente autenticado ve produtos ativos" (seção 4) sobre por que isto é necessário.
create policy "Cliente autenticado ve categorias ativas" on categorias for select to authenticated using (ativo = true);

-- eventos_integracao (migração 0011)
drop policy if exists "Admin autenticado ve eventos de integracao" on eventos_integracao;
create policy "Admin autenticado ve eventos de integracao" on eventos_integracao for select to authenticated using (is_admin());

-- conteudo_site (migração 0012)
drop policy if exists "Admin autenticado ve todo o conteudo" on conteudo_site;
create policy "Admin autenticado ve todo o conteudo" on conteudo_site for select to authenticated using (is_admin());
drop policy if exists "Admin autenticado cria versao de conteudo" on conteudo_site;
create policy "Admin autenticado cria versao de conteudo" on conteudo_site for insert to authenticated with check (is_admin());
drop policy if exists "Admin autenticado atualiza status de publicacao" on conteudo_site;
create policy "Admin autenticado atualiza status de publicacao" on conteudo_site for update to authenticated using (is_admin()) with check (is_admin());

-- banners (migração 0012)
drop policy if exists "Admin autenticado ve todos os banners" on banners;
create policy "Admin autenticado ve todos os banners" on banners for select to authenticated using (is_admin());
drop policy if exists "Admin autenticado cria versao de banner" on banners;
create policy "Admin autenticado cria versao de banner" on banners for insert to authenticated with check (is_admin());
drop policy if exists "Admin autenticado atualiza status de publicacao de banner" on banners;
create policy "Admin autenticado atualiza status de publicacao de banner" on banners for update to authenticated using (is_admin()) with check (is_admin());

-- clientes_crm (migração 0013)
drop policy if exists "Admin autenticado ve dados de CRM" on clientes_crm;
create policy "Admin autenticado ve dados de CRM" on clientes_crm for select to authenticated using (is_admin());
drop policy if exists "Admin autenticado grava dados de CRM" on clientes_crm;
create policy "Admin autenticado grava dados de CRM" on clientes_crm for insert to authenticated with check (is_admin());
drop policy if exists "Admin autenticado atualiza dados de CRM" on clientes_crm;
create policy "Admin autenticado atualiza dados de CRM" on clientes_crm for update to authenticated using (is_admin()) with check (is_admin());

-- tickets (migração 0014)
drop policy if exists "Admin autenticado ve tickets" on tickets;
create policy "Admin autenticado ve tickets" on tickets for select to authenticated using (is_admin());
drop policy if exists "Admin autenticado cria tickets" on tickets;
create policy "Admin autenticado cria tickets" on tickets for insert to authenticated with check (is_admin());
drop policy if exists "Admin autenticado atualiza tickets" on tickets;
create policy "Admin autenticado atualiza tickets" on tickets for update to authenticated using (is_admin()) with check (is_admin());

-- ticket_respostas (migração 0014)
drop policy if exists "Admin autenticado ve respostas de ticket" on ticket_respostas;
create policy "Admin autenticado ve respostas de ticket" on ticket_respostas for select to authenticated using (is_admin());
drop policy if exists "Admin autenticado cria respostas de ticket" on ticket_respostas;
create policy "Admin autenticado cria respostas de ticket" on ticket_respostas for insert to authenticated with check (is_admin());

-- storage.objects do bucket "admin-imagens" (migração 0016) — leitura
-- pública (bucket public=true) fica intocada, só escrita/atualização/
-- exclusão passam a exigir is_admin().
drop policy if exists "admin_imagens_insercao_admin" on storage.objects;
create policy "admin_imagens_insercao_admin" on storage.objects for insert to authenticated with check (bucket_id = 'admin-imagens' and is_admin());
drop policy if exists "admin_imagens_atualizacao_admin" on storage.objects;
create policy "admin_imagens_atualizacao_admin" on storage.objects for update to authenticated using (bucket_id = 'admin-imagens' and is_admin()) with check (bucket_id = 'admin-imagens' and is_admin());
drop policy if exists "admin_imagens_exclusao_admin" on storage.objects;
create policy "admin_imagens_exclusao_admin" on storage.objects for delete to authenticated using (bucket_id = 'admin-imagens' and is_admin());

-- ---------------------------------------------------------------------------
-- 3. Cliente: conta própria (auth_user_id) + endereço padrão
-- ---------------------------------------------------------------------------
alter table clientes
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists endereco_cep text,
  add column if not exists endereco_rua text,
  add column if not exists endereco_numero text,
  add column if not exists endereco_complemento text,
  add column if not exists endereco_bairro text,
  add column if not exists endereco_cidade text,
  add column if not exists endereco_uf text;

comment on column clientes.auth_user_id is 'Referência a auth.users — preenchida quando o cliente cria/vincula uma conta (login) a este registro. NULL = cliente que só comprou como convidado, sem conta. Ver src/lib/clientes/sessao.ts.';
comment on column clientes.endereco_cep is 'Endereço padrão do cliente, editável em /conta e usado para pré-preencher o checkout. Independente do snapshot de endereço já gravado em cada pedido (pedidos.endereco_*), que nunca muda depois da compra.';

create unique index if not exists uq_clientes_auth_user_id on clientes (auth_user_id) where auth_user_id is not null;

-- ---------------------------------------------------------------------------
-- 4. produtos / clientes / pedidos / pedido_itens: políticas "to
--    authenticated" pré-existentes, criadas direto no Supabase ANTES de
--    existir controle de migration (não há arquivo 0000_...sql — ver
--    HANDOFF.md). Como o nome exato dessas políticas é desconhecido,
--    elas são descobertas dinamicamente via pg_policies (filtrando só
--    role "authenticated" — políticas para "anon", como "produtos ativos
--    visíveis a anon", NUNCA são tocadas aqui) e recriadas com is_admin().
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('produtos', 'clientes', 'pedidos', 'pedido_itens')
      and roles @> array['authenticated']::name[]
  loop
    execute format('drop policy %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

-- produtos: admin continua vendo/gravando tudo (igual ao comportamento
-- anterior, só que agora restrito a quem está em "admins").
create policy "Admin gerencia produtos" on produtos for all to authenticated using (is_admin()) with check (is_admin());

-- IMPORTANTE: as páginas públicas (/produtos, /produtos/[id], seções da
-- home) leem produtos através do cliente Supabase COM SESSÃO
-- (criarClienteSupabaseServidor) — hoje um visitante sem login é "anon" e
-- cai na política "produtos ativos visíveis a anon" (pré-existente,
-- intocada). Um CLIENTE LOGADO passa a ser "authenticated", e sem esta
-- política ficaria sem enxergar nenhum produto ao navegar no site
-- logado — a régua de RLS pra quem tem conta não pode ser mais estrita
-- que a de quem não tem. Mesmo raciocínio replicado em marcas/categorias
-- abaixo.
create policy "Cliente autenticado ve produtos ativos" on produtos for select to authenticated using (ativo = true);

-- clientes: admin vê/edita tudo; cliente vê e edita só a própria linha
-- (a que tem auth_user_id = auth.uid()). Sem política de insert para
-- "authenticated": o cadastro de cliente cria a linha via service_role
-- (ver src/app/(site)/checkout/actions.ts e o novo fluxo de /cadastro),
-- nunca direto da sessão do navegador.
create policy "Admin ve e edita clientes" on clientes for select to authenticated using (is_admin());
create policy "Admin atualiza clientes" on clientes for update to authenticated using (is_admin()) with check (is_admin());
create policy "Cliente ve os proprios dados" on clientes for select to authenticated using (auth_user_id = auth.uid());
create policy "Cliente edita os proprios dados" on clientes for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- pedidos: admin vê/atualiza tudo (status de envio etc.); cliente só
-- enxerga os próprios pedidos, e nunca escreve neles diretamente (status
-- muda via webhook do Asaas / tela do admin, sempre com service_role ou
-- is_admin(), nunca pelo cliente).
create policy "Admin ve e atualiza pedidos" on pedidos for select to authenticated using (is_admin());
create policy "Admin atualiza pedidos" on pedidos for update to authenticated using (is_admin()) with check (is_admin());
create policy "Cliente ve os proprios pedidos" on pedidos for select to authenticated
  using (cliente_id in (select id from clientes where auth_user_id = auth.uid()));

-- pedido_itens: mesmo raciocínio de pedidos — só leitura, admin vê tudo,
-- cliente só os itens dos próprios pedidos.
create policy "Admin ve itens de pedido" on pedido_itens for select to authenticated using (is_admin());
create policy "Cliente ve itens dos proprios pedidos" on pedido_itens for select to authenticated
  using (pedido_id in (
    select p.id from pedidos p
    join clientes c on c.id = p.cliente_id
    where c.auth_user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Verificação sugerida após rodar esta migração no SQL Editor do Supabase
-- ---------------------------------------------------------------------------
-- select * from admins; -- deve ter exatamente 1 linha (o admin atual)
-- select tablename, policyname, roles, qual from pg_policies
--   where schemaname = 'public' and tablename in ('produtos','clientes','pedidos','pedido_itens')
--   order by tablename, policyname;
