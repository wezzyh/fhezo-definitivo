-- Páginas institucionais de texto simples (Sobre nós, Política de
-- privacidade, Trocas e devoluções, Termos de uso, etc.), editáveis pelo
-- admin em /admin/conteudo/paginas — dá função real aos links do footer
-- que hoje apontam para "#". Tabela própria (não conteudo_site): é uma
-- lista de registros independentes, sem necessidade de versionamento por
-- documento inteiro — mesmo raciocínio de clientes_crm/tickets.
--
-- "corpo" é texto simples (parágrafos separados por linha em branco,
-- renderizados com white-space: pre-line no site), não HTML/Markdown —
-- decisão deliberada para não introduzir editor rico/parser por um CRUD de
-- poucas páginas de texto institucional.
create table if not exists paginas_institucionais (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  corpo text not null,
  seo_titulo text null,
  seo_descricao text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table paginas_institucionais is 'Páginas institucionais de texto simples (Sobre nós, Política de privacidade, etc.), servidas em /institucional/<slug>. "corpo" é texto simples (parágrafos por linha em branco), não HTML/Markdown.';
comment on column paginas_institucionais.ativo is 'Só desativa (nunca exclui) — mesmo padrão de marcas/categorias. Página inativa não aparece no site (404) nem é linkada no footer.';

create or replace function paginas_institucionais_atualizar_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_paginas_institucionais_updated_at on paginas_institucionais;
create trigger trigger_paginas_institucionais_updated_at
  before update on paginas_institucionais
  for each row
  execute function paginas_institucionais_atualizar_updated_at();

alter table paginas_institucionais enable row level security;

drop policy if exists "Qualquer pessoa ve pagina institucional ativa" on paginas_institucionais;
create policy "Qualquer pessoa ve pagina institucional ativa"
  on paginas_institucionais for select
  to anon
  using (ativo);

drop policy if exists "Admin autenticado ve todas as paginas institucionais" on paginas_institucionais;
create policy "Admin autenticado ve todas as paginas institucionais"
  on paginas_institucionais for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado cria pagina institucional" on paginas_institucionais;
create policy "Admin autenticado cria pagina institucional"
  on paginas_institucionais for insert
  to authenticated
  with check (true);

drop policy if exists "Admin autenticado atualiza pagina institucional" on paginas_institucionais;
create policy "Admin autenticado atualiza pagina institucional"
  on paginas_institucionais for update
  to authenticated
  using (true)
  with check (true);

-- Sem política de DELETE — mesmo raciocínio de marcas/categorias/tickets:
-- só desativa.

-- Seed inicial: as 4 páginas hoje referenciadas pelo footer (que apontava
-- para "#"). Conteúdo placeholder, editável depois pelo admin.
insert into paginas_institucionais (slug, titulo, corpo, ativo)
values
  ('sobre-nos', 'Sobre nós', 'Conte aqui a história da Fhezo Industrial. Edite este texto em Admin > Conteúdo > Páginas.', true),
  ('politica-de-privacidade', 'Política de privacidade', 'Descreva aqui como os dados dos clientes são coletados e usados. Edite este texto em Admin > Conteúdo > Páginas.', true),
  ('trocas-e-devolucoes', 'Trocas e devoluções', 'Descreva aqui as condições de troca e devolução. Edite este texto em Admin > Conteúdo > Páginas.', true),
  ('termos-de-uso', 'Termos de uso', 'Descreva aqui os termos de uso do site. Edite este texto em Admin > Conteúdo > Páginas.', true)
on conflict (slug) do nothing;
