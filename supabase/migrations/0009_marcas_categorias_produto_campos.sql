-- Expande o modelo de produtos para suportar recursos futuros do admin
-- (indicador de qualidade, filtros de problema, importação em massa — não
-- implementados ainda, só a estrutura). Nesta migração:
--
--   1. Cria "marcas" (entidade própria, não texto livre).
--   2. Cria "categorias" (entidade própria, com hierarquia simples via
--      categoria_pai_id) e MIGRA os valores hoje soltos na coluna
--      "produtos.categoria" para lá, preservando o vínculo de cada
--      produto com sua categoria original (inclusive "Sem categoria" dos
--      produtos importados do Bling).
--   3. Adiciona ean, ncm, seo_titulo, seo_descricao, imagem_url e as
--      colunas de referência marca_id/categoria_id em "produtos".
--   4. Remove a antiga coluna de texto "produtos.categoria", já substituída
--      por categoria_id.
--
-- Tudo dentro de uma única transação: se qualquer passo falhar (por
-- exemplo, algum produto ficar sem categoria_id/marca_id depois do
-- backfill), a migração inteira é desfeita — nunca fica pela metade, e a
-- coluna antiga "categoria" só é removida se o backfill de TODOS os
-- produtos já tiver dado certo.
begin;

-- ---------------------------------------------------------------------------
-- 1. Marcas
-- ---------------------------------------------------------------------------

create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table marcas is 'Marcas dos produtos — entidade própria (não texto livre) para permitir filtro/gestão consistente no admin.';

alter table marcas enable row level security;

drop policy if exists "Visitantes veem marcas ativas" on marcas;
create policy "Visitantes veem marcas ativas"
  on marcas for select
  to anon
  using (ativo = true);

drop policy if exists "Admin autenticado ve todas as marcas" on marcas;
create policy "Admin autenticado ve todas as marcas"
  on marcas for select
  to authenticated
  using (true);

drop policy if exists "Admin pode inserir marcas" on marcas;
create policy "Admin pode inserir marcas"
  on marcas for insert
  to authenticated
  with check (true);

drop policy if exists "Admin pode atualizar marcas" on marcas;
create policy "Admin pode atualizar marcas"
  on marcas for update
  to authenticated
  using (true)
  with check (true);

-- Sem política de DELETE de propósito: o admin só ativa/desativa marcas
-- (ver /admin/marcas) — nunca exclui, porque produtos.marca_id é
-- obrigatório e referencia esta tabela.

-- ---------------------------------------------------------------------------
-- 2. Categorias (com hierarquia simples: categoria_pai_id)
-- ---------------------------------------------------------------------------

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  categoria_pai_id uuid references categorias(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table categorias is 'Categorias dos produtos — entidade própria, com hierarquia simples (ex.: Rolamentos > Rolamentos Rígidos) via categoria_pai_id.';
comment on column categorias.categoria_pai_id is 'Categoria-mãe, para subcategorias. NULL = categoria de topo.';

alter table categorias enable row level security;

drop policy if exists "Visitantes veem categorias ativas" on categorias;
create policy "Visitantes veem categorias ativas"
  on categorias for select
  to anon
  using (ativo = true);

drop policy if exists "Admin autenticado ve todas as categorias" on categorias;
create policy "Admin autenticado ve todas as categorias"
  on categorias for select
  to authenticated
  using (true);

drop policy if exists "Admin pode inserir categorias" on categorias;
create policy "Admin pode inserir categorias"
  on categorias for insert
  to authenticated
  with check (true);

drop policy if exists "Admin pode atualizar categorias" on categorias;
create policy "Admin pode atualizar categorias"
  on categorias for update
  to authenticated
  using (true)
  with check (true);

-- Mesmo raciocínio das marcas: sem DELETE, só ativar/desativar.

-- Função utilitária para gerar slug a partir do nome (usada no backfill
-- abaixo e reaproveitável pelo app se algum dia precisar gerar slug no
-- banco). unaccent() remove acentos ("Rolamentos Rígidos" -> "rolamentos
-- rigidos") antes de normalizar para minúsculas e trocar tudo que não for
-- letra/número por hífen.
create extension if not exists unaccent;

create or replace function gerar_slug(texto text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(texto)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- 3. Novas colunas em "produtos"
-- ---------------------------------------------------------------------------

alter table produtos
  add column if not exists marca_id uuid references marcas(id) on delete restrict,
  add column if not exists categoria_id uuid references categorias(id) on delete restrict,
  add column if not exists ean text,
  add column if not exists ncm text,
  add column if not exists seo_titulo text,
  add column if not exists seo_descricao text,
  add column if not exists imagem_url text;

comment on column produtos.marca_id is 'Marca do produto (referência a marcas.id) — obrigatório.';
comment on column produtos.categoria_id is 'Categoria do produto (referência a categorias.id) — obrigatório.';
comment on column produtos.ean is 'Código de barras (EAN/GTIN), opcional.';
comment on column produtos.ncm is 'Código fiscal (NCM) usado na nota fiscal, opcional.';
comment on column produtos.seo_titulo is 'Título customizado para SEO da página do produto, opcional (usa o nome do produto quando vazio).';
comment on column produtos.seo_descricao is 'Meta descrição customizada para SEO da página do produto, opcional.';
comment on column produtos.imagem_url is 'URL da imagem principal do produto, opcional. Ver nota de arquitetura no fim deste arquivo sobre a escolha de uma coluna simples em vez de uma tabela de galeria.';

-- ---------------------------------------------------------------------------
-- 4. Migração dos dados existentes
-- ---------------------------------------------------------------------------

-- 4a. Marca padrão: nenhum produto tinha marca antes desta migração, então
-- todos os produtos existentes (inclusive os importados do Bling) recebem
-- a marca "Sem marca" — igual ao padrão já usado para categoria nos
-- produtos do Bling ("Sem categoria"), até revisão manual no admin.
insert into marcas (nome, ativo)
values ('Sem marca', true)
on conflict (nome) do nothing;

-- 4b. Uma linha em "categorias" para cada valor distinto que já existia em
-- produtos.categoria (texto livre) — incluindo "Sem categoria", que passa
-- a ser uma categoria normal como qualquer outra. gerar_slug() pode
-- produzir o mesmo slug para nomes diferentes só na grafia (raro, mas
-- possível) — o row_number()/sufixo abaixo evita colisão de slug único
-- nesse caso, sem perder nenhuma categoria.
with categorias_distintas as (
  select distinct trim(categoria) as nome
  from produtos
  where categoria is not null and trim(categoria) <> ''
),
categorias_com_slug as (
  select
    nome,
    gerar_slug(nome) as slug_base,
    row_number() over (partition by gerar_slug(nome) order by nome) as ordem
  from categorias_distintas
)
insert into categorias (nome, slug, ativo)
select
  nome,
  case when ordem = 1 then slug_base else slug_base || '-' || ordem end,
  true
from categorias_com_slug
on conflict (slug) do nothing;

-- 4c. Vincula cada produto à categoria correspondente (por nome, já
-- normalizado com trim acima) e à marca padrão.
update produtos p
set categoria_id = c.id
from categorias c
where p.categoria_id is null
  and c.nome = trim(p.categoria);

update produtos
set marca_id = (select id from marcas where nome = 'Sem marca')
where marca_id is null;

-- 4d. Trava de segurança: se sobrar algum produto sem categoria_id (não
-- deveria acontecer — "categoria" era obrigatória — mas melhor falhar
-- alto e claro aqui, com ROLLBACK automático de tudo, do que deixar
-- produto órfão ou a migração seguir escondendo o problema).
do $$
declare
  produtos_sem_categoria integer;
begin
  select count(*) into produtos_sem_categoria from produtos where categoria_id is null;
  if produtos_sem_categoria > 0 then
    raise exception 'Migração abortada: % produto(s) ficaram sem categoria_id após o backfill.', produtos_sem_categoria;
  end if;
end $$;

-- 4e. Agora que todo produto tem categoria_id/marca_id, torna as colunas
-- obrigatórias (espelhando a obrigatoriedade que "categoria" já tinha) e
-- remove a antiga coluna de texto — categoria_id é a nova fonte da
-- verdade, sem mais nenhum código no app lendo/gravando "produtos.categoria".
alter table produtos
  alter column categoria_id set not null,
  alter column marca_id set not null;

alter table produtos drop column if exists categoria;

commit;

-- ---------------------------------------------------------------------------
-- Nota de arquitetura: imagem_url (coluna) em vez de produto_imagens
-- (tabela separada)
-- ---------------------------------------------------------------------------
-- Optei por uma única coluna "imagem_url" em vez de criar uma tabela
-- "produto_imagens" porque:
--   - O requisito atual é só "pelo menos 1 imagem principal" — galeria com
--     múltiplas fotos foi explicitamente adiada.
--   - O projeto ainda não tem nenhum bucket de storage/upload configurado;
--     por ora o campo aceita uma URL (ex.: de um CDN externo), sem
--     depender de infraestrutura nova.
--   - Uma tabela separada implicaria join extra em toda listagem pública
--     de produtos, política de RLS própria, UI de reordenar/definir
--     capa — complexidade que não tem uso nenhum enquanto só existir 1
--     imagem por produto.
-- Se/quando for preciso suportar galeria de múltiplas fotos, dá para
-- criar "produto_imagens" depois (id, produto_id, url, posicao, capa) sem
-- quebrar nada — "imagem_url" pode inclusive continuar como cache da capa.

-- ---------------------------------------------------------------------------
-- Verificação sugerida após rodar esta migração no SQL Editor do Supabase
-- ---------------------------------------------------------------------------
-- select count(*) from produtos where categoria_id is null or marca_id is null; -- deve ser 0
-- select p.sku, p.nome, m.nome as marca, c.nome as categoria
--   from produtos p join marcas m on m.id = p.marca_id join categorias c on c.id = p.categoria_id
--   order by p.created_at desc limit 20;
