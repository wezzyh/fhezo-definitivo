-- Sistema de gestão de conteúdo versionado para o site público: menu de
-- categorias, seções da home e tokens de cor do tema passam a ser dado
-- editável pelo admin (em /admin/conteudo/*), não mais texto fixo no
-- código de src/components/layout/nav.tsx, src/app/(site)/page.tsx e
-- src/app/globals.css. Banners (novo, não existia antes) também entram
-- aqui.
--
-- Arquitetura mista, decidida com o usuário:
--   - "menu", "home" e "tema" (tabela conteudo_site): cada edição grava o
--     DOCUMENTO INTEIRO daquele tipo como uma nova linha com versão
--     incrementada — nunca sobrescreve. "Publicar" marca a versão nova
--     como publicado=true e desmarca a anterior. "Restaurar" recria uma
--     versão nova com o conteúdo de uma versão antiga (histórico só
--     cresce, nunca é apagado).
--   - "banners" (tabela própria): cada banner é uma unidade independente,
--     identificada por um "banner_id" ESTÁVEL entre versões (diferente do
--     "id" da linha, que muda a cada versão). Editar/reordenar/publicar um
--     banner cria uma nova versão só daquele banner, sem tocar no
--     histórico dos outros — permite reverter um banner específico sem
--     afetar os demais.
--
-- Em ambas as tabelas, "no máximo uma versão publicada por documento" é
-- garantido por um índice único PARCIAL (where publicado), não só por
-- convenção da aplicação.
--
-- A publicação em si (desmarcar a versão publicada anterior + inserir a
-- nova já como publicada) é feita por uma função SQL (publicar_conteudo_
-- site / publicar_banner) em vez de dois comandos separados a partir do
-- client, para que as duas operações aconteçam atomicamente dentro da
-- mesma transação implícita da chamada da função — o site nunca fica um
-- instante sem nenhuma versão publicada (ou com duas) se algo falhar no
-- meio.

create table if not exists conteudo_site (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('menu', 'home', 'tema')),
  dados jsonb not null,
  versao integer not null,
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table conteudo_site is 'Conteúdo versionado do site (menu, home, tema) editável pelo admin sem deploy. Cada linha é uma versão imutável de um "tipo" — nunca é sobrescrita, só marcada publicado=true/false.';
comment on column conteudo_site.tipo is 'Um de: ''menu'', ''home'', ''tema''. Formato de "dados" depende do tipo — ver src/lib/conteudo/tipos.ts.';
comment on column conteudo_site.versao is 'Incremental por tipo, começando em 1. Nunca reaproveitado (nem ao restaurar uma versão antiga — restaurar cria uma versão NOVA com o conteúdo copiado).';

create unique index if not exists uq_conteudo_site_versao on conteudo_site (tipo, versao);
create unique index if not exists uq_conteudo_site_publicado on conteudo_site (tipo) where publicado;

alter table conteudo_site enable row level security;

drop policy if exists "Qualquer pessoa ve conteudo publicado" on conteudo_site;
create policy "Qualquer pessoa ve conteudo publicado"
  on conteudo_site for select
  to anon
  using (publicado);

drop policy if exists "Admin autenticado ve todo o conteudo" on conteudo_site;
create policy "Admin autenticado ve todo o conteudo"
  on conteudo_site for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado cria versao de conteudo" on conteudo_site;
create policy "Admin autenticado cria versao de conteudo"
  on conteudo_site for insert
  to authenticated
  with check (true);

drop policy if exists "Admin autenticado atualiza status de publicacao" on conteudo_site;
create policy "Admin autenticado atualiza status de publicacao"
  on conteudo_site for update
  to authenticated
  using (true)
  with check (true);

-- Sem política de delete: histórico nunca é apagado, só desmarcado como
-- publicado (ver comentário no topo do arquivo).


create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null default gen_random_uuid(),
  dados jsonb not null,
  versao integer not null,
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table banners is 'Banners do site, versionados POR ITEM (banner_id é estável entre versões; id muda a cada versão). Ver comentário no topo do arquivo de migration para o racional.';
comment on column banners.banner_id is 'Identificador estável do banner ao longo de todas as suas versões — usado para editar/publicar/restaurar UM banner sem afetar os demais.';
comment on column banners.dados is 'Formato: { imagem_url, link_url, titulo, ordem, ativo, data_inicio, data_fim } — ver src/lib/conteudo/tipos.ts (DadosBanner).';

create unique index if not exists uq_banners_versao on banners (banner_id, versao);
create unique index if not exists uq_banners_publicado on banners (banner_id) where publicado;

alter table banners enable row level security;

drop policy if exists "Qualquer pessoa ve banners publicados" on banners;
create policy "Qualquer pessoa ve banners publicados"
  on banners for select
  to anon
  using (publicado);

drop policy if exists "Admin autenticado ve todos os banners" on banners;
create policy "Admin autenticado ve todos os banners"
  on banners for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado cria versao de banner" on banners;
create policy "Admin autenticado cria versao de banner"
  on banners for insert
  to authenticated
  with check (true);

drop policy if exists "Admin autenticado atualiza status de publicacao de banner" on banners;
create policy "Admin autenticado atualiza status de publicacao de banner"
  on banners for update
  to authenticated
  using (true)
  with check (true);

-- Sem política de delete: mesmo racional de conteudo_site.


-- Publica uma nova versão de um tipo de conteúdo (menu/home/tema): desmarca
-- a versão publicada anterior desse tipo e insere a nova já publicada,
-- atomicamente. security invoker (padrão) + search_path fixo: roda com o
-- privilégio de quem chama (respeita as políticas de RLS acima) sem risco
-- de sequestro de search_path.
create or replace function publicar_conteudo_site(p_tipo text, p_dados jsonb, p_created_by uuid)
returns conteudo_site
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_versao integer;
  v_linha conteudo_site;
begin
  select coalesce(max(versao), 0) + 1 into v_versao from conteudo_site where tipo = p_tipo;

  update conteudo_site set publicado = false where tipo = p_tipo and publicado = true;

  insert into conteudo_site (tipo, dados, versao, publicado, created_by)
  values (p_tipo, p_dados, v_versao, true, p_created_by)
  returning * into v_linha;

  return v_linha;
end;
$$;

revoke all on function publicar_conteudo_site(text, jsonb, uuid) from public;
grant execute on function publicar_conteudo_site(text, jsonb, uuid) to authenticated;

-- Mesma lógica de publicar_conteudo_site, mas por banner_id — permite
-- publicar/restaurar um banner sem tocar nos demais. p_banner_id nulo cria
-- um banner novo (gera o banner_id); informado, cria mais uma versão do
-- banner existente.
create or replace function publicar_banner(p_banner_id uuid, p_dados jsonb, p_created_by uuid)
returns banners
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_banner_id uuid := coalesce(p_banner_id, gen_random_uuid());
  v_versao integer;
  v_linha banners;
begin
  select coalesce(max(versao), 0) + 1 into v_versao from banners where banner_id = v_banner_id;

  update banners set publicado = false where banner_id = v_banner_id and publicado = true;

  insert into banners (banner_id, dados, versao, publicado, created_by)
  values (v_banner_id, p_dados, v_versao, true, p_created_by)
  returning * into v_linha;

  return v_linha;
end;
$$;

revoke all on function publicar_banner(uuid, jsonb, uuid) from public;
grant execute on function publicar_banner(uuid, jsonb, uuid) to authenticated;


-- Migração de dados: grava o conteúdo hoje hardcoded no código como a
-- "versão 1" publicada de menu, home e tema, para o site nunca ficar sem
-- conteúdo depois dessa mudança. Espelha exatamente
-- src/lib/conteudo/padroes.ts (MENU_PADRAO, HOME_PADRAO, TEMA_PADRAO) — se
-- um dos dois lados mudar, atualize o outro. Idempotente (roda de novo sem
-- duplicar) via "where not exists".
--
-- O menu é migrado com todos os itens tipo "link" apontando pra /produtos
-- — o comportamento atual, idêntico ao hardcoded em nav.tsx antes dessa
-- mudança. Nenhum item vira tipo "categoria" automaticamente aqui, pra não
-- arriscar linkar a categoria errada sem confirmação humana: use
-- /admin/conteudo/menu depois pra vincular os itens às categorias reais.
--
-- "Produtos em destaque" na home passa a ser automático (modo:
-- "automatico", sem categoria = produtos ativos mais recentes) em vez do
-- array mockado que existia em page.tsx — não fazia sentido preservar
-- dado de exemplo ("Dados mockados apenas para visualização do layout")
-- como se fosse conteúdo real.
insert into conteudo_site (tipo, dados, versao, publicado)
select 'menu',
  '{"itens": [
    {"id": "todos", "rotulo": "Todos os produtos", "tipo": "todos", "categoria_id": null, "href": "/produtos", "ordem": 1, "filhos": []},
    {"id": "rolamentos", "rotulo": "Rolamentos", "tipo": "link", "categoria_id": null, "href": "/produtos", "ordem": 2, "filhos": []},
    {"id": "engrenagens", "rotulo": "Engrenagens", "tipo": "link", "categoria_id": null, "href": "/produtos", "ordem": 3, "filhos": []},
    {"id": "correntes", "rotulo": "Correntes", "tipo": "link", "categoria_id": null, "href": "/produtos", "ordem": 4, "filhos": []},
    {"id": "graxas", "rotulo": "Graxas e Lubrificantes", "tipo": "link", "categoria_id": null, "href": "/produtos", "ordem": 5, "filhos": []},
    {"id": "ferramentas", "rotulo": "Ferramentas", "tipo": "link", "categoria_id": null, "href": "/produtos", "ordem": 6, "filhos": []},
    {"id": "parafusos", "rotulo": "Parafusos e Porcas", "tipo": "link", "categoria_id": null, "href": "/produtos", "ordem": 7, "filhos": []}
  ]}'::jsonb,
  1, true
where not exists (select 1 from conteudo_site where tipo = 'menu');

insert into conteudo_site (tipo, dados, versao, publicado)
select 'home',
  '{"secoes": [
    {"id": "hero", "tipo": "hero", "titulo": "Componentes industriais de precisão para manter sua operação em movimento", "subtitulo": "Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais, com estoque pronto e atendimento técnico especializado.", "cta_texto": "Ver catálogo de produtos", "cta_href": "/produtos", "ordem": 1, "ativo": true},
    {"id": "produtos-destaque", "tipo": "produtos_destaque", "titulo": "Produtos em destaque", "subtitulo": "Uma seleção dos itens mais procurados pelos nossos clientes.", "modo": "automatico", "produto_ids": [], "categoria_id": null, "limite": 4, "ordem": 2, "ativo": true}
  ]}'::jsonb,
  1, true
where not exists (select 1 from conteudo_site where tipo = 'home');

insert into conteudo_site (tipo, dados, versao, publicado)
select 'tema',
  '{"cores": {"brand_green": "#009b6c", "brand_green_dark": "#007a54", "dark": "#0d0d0d", "dark_2": "#1a1a1a", "page": "#f5f5f3", "ink": "#1a1a1a", "muted": "#5f5e5a", "warning": "#e8b93a"}}'::jsonb,
  1, true
where not exists (select 1 from conteudo_site where tipo = 'tema');

-- Banners não têm conteúdo hardcoded pra migrar (é um recurso novo — não
-- existia carrossel/banner de imagem no site antes desta mudança), por
-- isso não há seed aqui: a tabela começa vazia e o site trata "nenhum
-- banner publicado" como um estado normal (não renderiza a seção).
