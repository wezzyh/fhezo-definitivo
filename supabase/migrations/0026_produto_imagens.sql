-- Galeria de imagens por produto — antes desta migration só existia
-- "produtos.imagem_url" (1 imagem). A migration 0009 já previa essa
-- evolução exatamente neste formato (ver comentário "Nota de arquitetura"
-- naquele arquivo). "produtos.imagem_url" continua existindo e agora
-- funciona como CACHE da capa (primeira imagem, capa=true) — toda a
-- listagem pública/admin que já lia "imagem_url" continua funcionando sem
-- nenhuma mudança; só a página de produto passa a mostrar a galeria
-- completa.
create table if not exists produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  url text not null,
  posicao integer not null default 0,
  capa boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table produto_imagens is 'Galeria de imagens de um produto. "produtos.imagem_url" continua existindo como cache da imagem com capa=true (evita mudar toda leitura pública que já usa imagem_url).';
comment on column produto_imagens.capa is 'No máximo 1 imagem com capa=true por produto (garantido pelo índice único parcial abaixo) — é o que sincroniza com produtos.imagem_url.';

create index if not exists idx_produto_imagens_produto_id on produto_imagens (produto_id, posicao);
create unique index if not exists uq_produto_imagens_capa on produto_imagens (produto_id) where capa;

alter table produto_imagens enable row level security;

-- Mesma regra de "produtos": anon só vê imagens de produto ativo.
drop policy if exists "Qualquer pessoa ve imagens de produto ativo" on produto_imagens;
create policy "Qualquer pessoa ve imagens de produto ativo"
  on produto_imagens for select
  to anon
  using (exists (select 1 from produtos where produtos.id = produto_imagens.produto_id and produtos.ativo));

drop policy if exists "Admin autenticado ve todas as imagens de produto" on produto_imagens;
create policy "Admin autenticado ve todas as imagens de produto"
  on produto_imagens for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado gerencia imagens de produto" on produto_imagens;
create policy "Admin autenticado gerencia imagens de produto"
  on produto_imagens for all
  to authenticated
  using (true)
  with check (true);
