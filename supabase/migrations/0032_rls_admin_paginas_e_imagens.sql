-- APPSEC-024 — qualquer cliente autenticado conseguia ESCREVER em
-- paginas_institucionais e produto_imagens.
--
-- Causa: a migração 0018 trocou "using (true)" por "is_admin()" em todas as
-- políticas "to authenticated" das tabelas que existiam naquele momento.
-- paginas_institucionais (0021) e produto_imagens (0026) foram criadas
-- DEPOIS e nasceram com a regra antiga ("authenticated == o único admin"),
-- que deixou de valer quando o cadastro de cliente passou a existir. Com a
-- anon key (pública) e o JWT da própria sessão, um cliente conseguia
-- reescrever Termos de Uso/Política de Privacidade e inserir, trocar ou
-- apagar fotos de qualquer produto direto pelo PostgREST.
--
-- Depois desta migração:
--   anon                 → lê página ATIVA e imagem de produto ATIVO (políticas
--                          da 0021/0026, intocadas); não escreve nada.
--   cliente autenticado  → lê exatamente o mesmo que anon; não escreve nada.
--   admin (is_admin())   → lê tudo (inclusive inativos) e administra.
--
-- paginas_institucionais continua SEM política de DELETE, nem para o admin:
-- convenção do projeto para tabelas cuja tela só oferece ativar/desativar
-- (ver 0021 e HANDOFF.md). produto_imagens tem DELETE para o admin porque a
-- galeria do painel remove imagens.
--
-- Idempotente: pode rodar mais de uma vez. Tudo numa transação — as
-- políticas antigas e as novas nunca coexistem nem somem pela metade.

begin;

-- ---------------------------------------------------------------------------
-- paginas_institucionais
-- ---------------------------------------------------------------------------
drop policy if exists "Admin autenticado ve todas as paginas institucionais" on paginas_institucionais;
drop policy if exists "Admin autenticado cria pagina institucional" on paginas_institucionais;
drop policy if exists "Admin autenticado atualiza pagina institucional" on paginas_institucionais;

drop policy if exists "Admin ve todas as paginas institucionais" on paginas_institucionais;
drop policy if exists "Cliente autenticado ve pagina institucional ativa" on paginas_institucionais;
drop policy if exists "Admin cria pagina institucional" on paginas_institucionais;
drop policy if exists "Admin atualiza pagina institucional" on paginas_institucionais;

create policy "Admin ve todas as paginas institucionais"
  on paginas_institucionais for select
  to authenticated
  using (is_admin());

-- Cliente logado lê o mesmo que um visitante: /institucional/<slug> usa o
-- cliente Supabase com sessão, e sem esta política quem tem conta deixaria
-- de ver os Termos de Uso (mesmo raciocínio de "Cliente autenticado ve
-- produtos ativos" na 0018).
create policy "Cliente autenticado ve pagina institucional ativa"
  on paginas_institucionais for select
  to authenticated
  using (ativo);

create policy "Admin cria pagina institucional"
  on paginas_institucionais for insert
  to authenticated
  with check (is_admin());

create policy "Admin atualiza pagina institucional"
  on paginas_institucionais for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- produto_imagens
-- ---------------------------------------------------------------------------
drop policy if exists "Admin autenticado ve todas as imagens de produto" on produto_imagens;
drop policy if exists "Admin autenticado gerencia imagens de produto" on produto_imagens;

drop policy if exists "Admin ve todas as imagens de produto" on produto_imagens;
drop policy if exists "Cliente autenticado ve imagens de produto ativo" on produto_imagens;
drop policy if exists "Admin cria imagem de produto" on produto_imagens;
drop policy if exists "Admin atualiza imagem de produto" on produto_imagens;
drop policy if exists "Admin exclui imagem de produto" on produto_imagens;

create policy "Admin ve todas as imagens de produto"
  on produto_imagens for select
  to authenticated
  using (is_admin());

-- Mesma condição da política de anon (0026): /produtos/<id> lê a galeria
-- com a sessão do usuário.
create policy "Cliente autenticado ve imagens de produto ativo"
  on produto_imagens for select
  to authenticated
  using (exists (select 1 from produtos where produtos.id = produto_imagens.produto_id and produtos.ativo));

create policy "Admin cria imagem de produto"
  on produto_imagens for insert
  to authenticated
  with check (is_admin());

create policy "Admin atualiza imagem de produto"
  on produto_imagens for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Admin exclui imagem de produto"
  on produto_imagens for delete
  to authenticated
  using (is_admin());

commit;

-- ---------------------------------------------------------------------------
-- Verificação (rode depois):
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd, roles, qual, with_check from pg_policies
--   where schemaname = 'public' and tablename in ('paginas_institucionais', 'produto_imagens')
--   order by tablename, cmd, policyname;
-- Esperado: nenhuma política de INSERT/UPDATE/DELETE/ALL com qual ou
-- with_check = 'true'; toda escrita com is_admin().
-- Teste completo dos três perfis: supabase/testes/rls_appsec_024.sql
