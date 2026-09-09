-- Ordenação manual de categorias (▲▼ em /admin/categorias), refletida no
-- carrossel da home e no mega-menu do header — antes disso a ordem era
-- sempre alfabética (nome), sem controle do admin.
alter table categorias add column if not exists ordem integer not null default 0;

comment on column categorias.ordem is 'Ordem manual entre irmãs (mesma categoria_pai_id) — controlada pelos botões ▲▼ em /admin/categorias. Não é global: cada nível da hierarquia é ordenado separadamente.';

-- Backfill: preserva a ordem alfabética atual como ponto de partida (nada
-- muda visualmente até o admin reordenar pela primeira vez).
with ordenadas as (
  select id, row_number() over (partition by categoria_pai_id order by nome) as posicao
  from categorias
)
update categorias
set ordem = ordenadas.posicao
from ordenadas
where categorias.id = ordenadas.id;
