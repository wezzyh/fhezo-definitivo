-- Imagem (ícone circular, mesmo padrão de categorias.imagem_url, migration
-- 0020) e ordem manual pra marcas — usados na nova seção "Compre por
-- marca" da home (src/components/home/faixa-marcas.tsx).
alter table marcas add column if not exists imagem_url text null;
alter table marcas add column if not exists ordem integer not null default 0;

comment on column marcas.imagem_url is 'URL pública da imagem da marca (bucket admin-imagens, pasta "marcas"). Null = marca não aparece em "Compre por marca" (a seção só lista marcas com imagem).';
comment on column marcas.ordem is 'Ordem manual (▲▼ em /admin/marcas) — controla a ordem em "Compre por marca" na home.';

-- Backfill: preserva a ordem alfabética atual como ponto de partida.
with ordenadas as (
  select id, row_number() over (order by nome) as posicao
  from marcas
)
update marcas
set ordem = ordenadas.posicao
from ordenadas
where marcas.id = ordenadas.id;
