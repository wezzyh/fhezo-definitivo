-- ===========================================================================
-- Teste de RLS — APPSEC-024 (paginas_institucionais e produto_imagens)
-- ===========================================================================
-- Rode no SQL Editor do Supabase DEPOIS da migração 0032.
--
-- SEGURANÇA DO TESTE:
-- - Tudo roda dentro de BEGIN ... ROLLBACK: nada do que ele faz fica gravado.
-- - Mesmo assim, ele só insere/altera/apaga LINHAS DE TESTE que ele mesmo
--   cria (slug "teste-rls-appsec-024", imagem "https://exemplo.invalid/...").
--   As únicas operações sobre linhas reais são "set titulo = titulo" e
--   "set posicao = posicao", que não mudam nada nem se forem permitidas.
-- - A página de teste é criada INATIVA (não aparece no site).
--
-- RESULTADO ESPERADO: só mensagens "OK ..." (aba de mensagens/NOTICE) e
-- nenhum erro. Qualquer "FALHA ..." interrompe o script com exceção.
--
-- Os três perfis são simulados como o PostgREST faz: SET LOCAL ROLE + as
-- claims do JWT (lidas por auth.uid() e, portanto, por is_admin()).
--   anon     → sem usuário
--   cliente  → UUID aleatório, fora da tabela "admins"
--   admin    → primeiro id da tabela "admins"
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Linhas de teste e contagens de referência (como dono do banco)
-- ---------------------------------------------------------------------------
insert into paginas_institucionais (slug, titulo, corpo, ativo)
values ('teste-rls-appsec-024', 'Teste RLS', 'Teste RLS — apagado no ROLLBACK.', false);

-- Prefere um produto INATIVO para a imagem de teste (não aparece no site).
insert into produto_imagens (produto_id, url, posicao, capa)
select id, 'https://exemplo.invalid/teste-rls-appsec-024.png', 999, false
from produtos
order by ativo asc, created_at asc
limit 1;

select set_config('teste.admin_id', coalesce((select id::text from admins limit 1), ''), true);
select set_config('teste.cliente_id', gen_random_uuid()::text, true);
select set_config('teste.produto_id', coalesce((select produto_id::text from produto_imagens where url = 'https://exemplo.invalid/teste-rls-appsec-024.png'), ''), true);
select set_config('teste.paginas_total', (select count(*)::text from paginas_institucionais), true);
select set_config('teste.paginas_ativas', (select count(*)::text from paginas_institucionais where ativo), true);
select set_config('teste.imagens_total', (select count(*)::text from produto_imagens), true);
select set_config('teste.imagens_de_ativos', (
  select count(*)::text from produto_imagens pi join produtos p on p.id = pi.produto_id where p.ativo
), true);

-- ---------------------------------------------------------------------------
-- 1. ANÔNIMO — lê só o público, não escreve
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  n bigint;
begin
  select count(*) into n from paginas_institucionais;
  if n <> current_setting('teste.paginas_ativas')::bigint then
    raise exception 'FALHA anon: vê % página(s), esperado % (só as ativas)', n, current_setting('teste.paginas_ativas');
  end if;
  raise notice 'OK anon: lê só as páginas ativas (%)', n;

  select count(*) into n from produto_imagens;
  if n <> current_setting('teste.imagens_de_ativos')::bigint then
    raise exception 'FALHA anon: vê % imagem(ns), esperado % (só de produtos ativos)', n, current_setting('teste.imagens_de_ativos');
  end if;
  raise notice 'OK anon: lê só imagens de produtos ativos (%)', n;

  begin
    insert into paginas_institucionais (slug, titulo, corpo) values ('teste-rls-appsec-024-anon', 'x', 'x');
    raise exception 'FALHA anon: conseguiu INSERIR página';
  exception when insufficient_privilege then
    raise notice 'OK anon: não insere página';
  end;

  update paginas_institucionais set titulo = titulo;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA anon: ATUALIZOU % página(s)', n; end if;
  raise notice 'OK anon: não atualiza página';

  delete from paginas_institucionais where slug = 'teste-rls-appsec-024';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA anon: EXCLUIU página'; end if;
  raise notice 'OK anon: não exclui página';

  if current_setting('teste.produto_id') <> '' then
    begin
      insert into produto_imagens (produto_id, url) values (current_setting('teste.produto_id')::uuid, 'https://exemplo.invalid/anon.png');
      raise exception 'FALHA anon: conseguiu INSERIR imagem';
    exception when insufficient_privilege then
      raise notice 'OK anon: não insere imagem';
    end;
  end if;

  update produto_imagens set posicao = posicao;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA anon: ATUALIZOU % imagem(ns)', n; end if;
  raise notice 'OK anon: não atualiza imagem';

  delete from produto_imagens where url = 'https://exemplo.invalid/teste-rls-appsec-024.png';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA anon: EXCLUIU imagem'; end if;
  raise notice 'OK anon: não exclui imagem';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 2. CLIENTE AUTENTICADO COMUM — lê o mesmo que anon, não escreve
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', current_setting('teste.cliente_id'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('teste.cliente_id'), true);
set local role authenticated;

do $$
declare
  n bigint;
begin
  if is_admin() then raise exception 'FALHA: o cliente de teste foi reconhecido como admin'; end if;

  select count(*) into n from paginas_institucionais;
  if n <> current_setting('teste.paginas_ativas')::bigint then
    raise exception 'FALHA cliente: vê % página(s), esperado % (só as ativas)', n, current_setting('teste.paginas_ativas');
  end if;
  raise notice 'OK cliente: lê só as páginas ativas (%)', n;

  select count(*) into n from produto_imagens;
  if n <> current_setting('teste.imagens_de_ativos')::bigint then
    raise exception 'FALHA cliente: vê % imagem(ns), esperado % (só de produtos ativos)', n, current_setting('teste.imagens_de_ativos');
  end if;
  raise notice 'OK cliente: lê só imagens de produtos ativos (%)', n;

  begin
    insert into paginas_institucionais (slug, titulo, corpo) values ('teste-rls-appsec-024-cliente', 'x', 'x');
    raise exception 'FALHA cliente: conseguiu INSERIR página';
  exception when insufficient_privilege then
    raise notice 'OK cliente: não insere página';
  end;

  update paginas_institucionais set titulo = titulo;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA cliente: ATUALIZOU % página(s)', n; end if;
  raise notice 'OK cliente: não atualiza página';

  delete from paginas_institucionais where slug = 'teste-rls-appsec-024';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA cliente: EXCLUIU página'; end if;
  raise notice 'OK cliente: não exclui página';

  if current_setting('teste.produto_id') <> '' then
    begin
      insert into produto_imagens (produto_id, url) values (current_setting('teste.produto_id')::uuid, 'https://exemplo.invalid/cliente.png');
      raise exception 'FALHA cliente: conseguiu INSERIR imagem';
    exception when insufficient_privilege then
      raise notice 'OK cliente: não insere imagem';
    end;
  end if;

  update produto_imagens set posicao = posicao;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA cliente: ATUALIZOU % imagem(ns)', n; end if;
  raise notice 'OK cliente: não atualiza imagem';

  delete from produto_imagens where url = 'https://exemplo.invalid/teste-rls-appsec-024.png';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA cliente: EXCLUIU imagem'; end if;
  raise notice 'OK cliente: não exclui imagem';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 3. ADMIN — lê tudo e administra
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', current_setting('teste.admin_id'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('teste.admin_id'), true);
set local role authenticated;

do $$
declare
  n bigint;
begin
  if current_setting('teste.admin_id') = '' then
    raise notice 'PULADO admin: a tabela "admins" está vazia';
    return;
  end if;
  if not is_admin() then raise exception 'FALHA: o admin de teste não foi reconhecido por is_admin()'; end if;

  select count(*) into n from paginas_institucionais;
  if n <> current_setting('teste.paginas_total')::bigint then
    raise exception 'FALHA admin: vê % página(s), esperado % (todas)', n, current_setting('teste.paginas_total');
  end if;
  raise notice 'OK admin: lê todas as páginas, inclusive inativas (%)', n;

  select count(*) into n from produto_imagens;
  if n <> current_setting('teste.imagens_total')::bigint then
    raise exception 'FALHA admin: vê % imagem(ns), esperado % (todas)', n, current_setting('teste.imagens_total');
  end if;
  raise notice 'OK admin: lê todas as imagens (%)', n;

  insert into paginas_institucionais (slug, titulo, corpo, ativo) values ('teste-rls-appsec-024-admin', 'x', 'x', false);
  raise notice 'OK admin: insere página';

  update paginas_institucionais set titulo = 'Teste RLS (admin)' where slug = 'teste-rls-appsec-024';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA admin: não conseguiu atualizar a página de teste'; end if;
  raise notice 'OK admin: atualiza página';

  delete from paginas_institucionais where slug = 'teste-rls-appsec-024';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA admin: EXCLUIU página — paginas_institucionais não deveria ter DELETE (só desativar)'; end if;
  raise notice 'OK admin: não exclui página (por convenção, só desativa)';

  if current_setting('teste.produto_id') <> '' then
    insert into produto_imagens (produto_id, url, posicao) values (current_setting('teste.produto_id')::uuid, 'https://exemplo.invalid/admin.png', 998);
    raise notice 'OK admin: insere imagem';

    update produto_imagens set posicao = 997 where url = 'https://exemplo.invalid/teste-rls-appsec-024.png';
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FALHA admin: não conseguiu atualizar a imagem de teste'; end if;
    raise notice 'OK admin: atualiza imagem';

    delete from produto_imagens where url = 'https://exemplo.invalid/teste-rls-appsec-024.png';
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FALHA admin: não conseguiu excluir a imagem de teste'; end if;
    raise notice 'OK admin: exclui imagem';
  end if;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 4. Estrutura: nenhuma política de escrita aberta nestas duas tabelas
-- ---------------------------------------------------------------------------
do $$
declare
  abertas text;
begin
  select string_agg(tablename || '.' || policyname, ', ') into abertas
  from pg_policies
  where schemaname = 'public'
    and tablename in ('paginas_institucionais', 'produto_imagens')
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');

  if abertas is not null then raise exception 'FALHA estrutura: políticas de escrita abertas: %', abertas; end if;
  raise notice 'OK estrutura: nenhuma política de escrita aberta em paginas_institucionais/produto_imagens';
end $$;

-- ---------------------------------------------------------------------------
-- Limpeza extra (só importa se o editor não respeitar a transação) e ROLLBACK
-- ---------------------------------------------------------------------------
delete from paginas_institucionais where slug like 'teste-rls-appsec-024%';
delete from produto_imagens where url like 'https://exemplo.invalid/%';

rollback;
