-- Correção de RLS: a política de leitura pública em "produtos" (que
-- restringe a `ativo = true`, para o site nunca mostrar produto inativo a
-- visitantes) também estava restringindo o admin autenticado — a tela
-- /admin/produtos, que precisa mostrar TODOS os produtos, inclusive
-- inativos (ex.: recém-importados do Bling aguardando revisão), só via um
-- produto ativo.
--
-- Isso nunca tinha aparecido antes porque não existia nenhum produto
-- inativo na tabela até a sincronização com o Bling criar os primeiros —
-- confirmado comparando a mesma query com service_role (bypassa RLS, vê
-- os 3 produtos) e com uma sessão real do admin autenticado (RLS, via só
-- 1 produto — o único ativo).
--
-- A correção só ADICIONA uma política nova para "authenticated" — não
-- mexe na política existente que restringe "anon" (visitantes do site) a
-- ativo = true, que continua correta e intocada. Políticas permissivas do
-- Postgres se combinam com OR, então essa nova política dá acesso total
-- ao admin autenticado sem afetar o que o site público mostra.
create policy "Admin autenticado ve todos os produtos"
  on produtos for select
  to authenticated
  using (true);
