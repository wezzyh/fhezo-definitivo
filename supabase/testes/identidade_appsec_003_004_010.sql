-- ===========================================================================
-- Teste de identidade e ownership no banco — APPSEC-003 / 004 / 010 / 018
-- ===========================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0033 e 0034.
--
-- SEGURANÇA DO TESTE:
-- - Tudo roda dentro de BEGIN ... ROLLBACK: nada do que ele faz fica gravado.
-- - Cria só dados de teste: dois usuários (e-mails @exemplo.invalid), duas
--   linhas de "clientes" e um pedido do cliente B. Todo UPDATE filtra pelo
--   id dessas linhas — nenhuma linha real é alterada.
-- - Se o INSERT em auth.users não for permitido no seu projeto, o script
--   para no começo com erro e nada é gravado.
--
-- RESULTADO ESPERADO: só mensagens "OK ..." (aba de mensagens/NOTICE) e
-- nenhum erro. Qualquer "FALHA ..." interrompe o script com exceção.
--
-- Perfis simulados como o PostgREST faz (SET LOCAL ROLE + claims do JWT):
--   cliente A / cliente B → usuários de teste, fora de "admins"
--   anon                  → sem usuário
--   admin                 → primeiro id da tabela "admins"
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Dados de teste (como dono do banco)
-- ---------------------------------------------------------------------------
select set_config('teste.user_a', gen_random_uuid()::text, true);
select set_config('teste.user_b', gen_random_uuid()::text, true);
select set_config('teste.admin_id', coalesce((select id::text from admins limit 1), ''), true);

insert into auth.users (id, email, aud, role)
values
  (current_setting('teste.user_a')::uuid, 'teste-identidade-a@exemplo.invalid', 'authenticated', 'authenticated'),
  (current_setting('teste.user_b')::uuid, 'teste-identidade-b@exemplo.invalid', 'authenticated', 'authenticated');

do $$
declare
  cliente_a uuid;
  cliente_b uuid;
  pedido_b uuid;
begin
  -- Documento sem dígitos: fica fora do índice único da 0034 e não colide
  -- com nenhum CPF/CNPJ real.
  insert into clientes (tipo, nome, documento, email, auth_user_id)
  values ('PF', 'Teste Identidade A', 'tst-ident-a', 'teste-identidade-a@exemplo.invalid', current_setting('teste.user_a')::uuid)
  returning id into cliente_a;

  insert into clientes (tipo, nome, documento, email, auth_user_id)
  values ('PF', 'Teste Identidade B', 'tst-ident-b', 'teste-identidade-b@exemplo.invalid', current_setting('teste.user_b')::uuid)
  returning id into cliente_b;

  insert into pedidos (cliente_id, status, total, forma_pagamento, frete_valor)
  values (cliente_b, 'pendente', 10, 'pix', 0)
  returning id into pedido_b;

  insert into pedido_itens (pedido_id, produto_id, quantidade, preco_unitario)
  select pedido_b, id, 1, 10 from produtos order by ativo asc limit 1;

  perform set_config('teste.cliente_a', cliente_a::text, true);
  perform set_config('teste.cliente_b', cliente_b::text, true);
  perform set_config('teste.pedido_b', pedido_b::text, true);
end $$;

select set_config('teste.clientes_total', (select count(*)::text from clientes), true);

-- ---------------------------------------------------------------------------
-- 1. CLIENTE A — só a própria linha, só as colunas liberadas, nada de B
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', current_setting('teste.user_a'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('teste.user_a'), true);
set local role authenticated;

do $$
declare
  n bigint;
  coluna text;
  a uuid := current_setting('teste.cliente_a')::uuid;
  b uuid := current_setting('teste.cliente_b')::uuid;
  pedido_b uuid := current_setting('teste.pedido_b')::uuid;
begin
  if is_admin() then raise exception 'FALHA: o cliente A de teste foi reconhecido como admin'; end if;

  select count(*) into n from clientes;
  if n <> 1 then raise exception 'FALHA cliente A: vê % linha(s) de clientes, esperado 1 (só a própria)', n; end if;
  raise notice 'OK cliente A: vê só a própria linha de clientes';

  -- APPSEC-010: o que a tela /conta grava continua funcionando.
  update clientes
     set nome = 'Teste A editado', telefone = '11912345678',
         endereco_cep = '01310100', endereco_rua = 'Rua Teste', endereco_numero = '1',
         endereco_complemento = null, endereco_bairro = 'Bairro', endereco_cidade = 'Cidade', endereco_uf = 'SP'
   where id = a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA cliente A: não conseguiu editar nome/telefone/endereço da própria linha'; end if;
  raise notice 'OK cliente A: edita nome, telefone e endereço (tela /conta)';

  -- APPSEC-010: PATCH direto em colunas de identidade/internas.
  foreach coluna in array array['documento', 'email', 'tipo', 'auth_user_id', 'id', 'created_at'] loop
    begin
      execute format('update clientes set %1$I = %1$I where id = $1', coluna) using a;
      raise exception 'FALHA cliente A: conseguiu alterar a coluna "%" da própria linha', coluna;
    exception when insufficient_privilege then
      raise notice 'OK cliente A: não altera "%"', coluna;
    end;
  end loop;

  -- APPSEC-004: tomar a linha (ou a conta) de B.
  begin
    update clientes set auth_user_id = current_setting('teste.user_a')::uuid where id = b;
    raise exception 'FALHA cliente A: UPDATE de auth_user_id na linha de B não foi barrado por privilégio';
  exception when insufficient_privilege then
    raise notice 'OK cliente A: não reatribui a linha de B para si';
  end;

  update clientes set nome = 'invadido' where id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA cliente A: ALTEROU a linha do cliente B'; end if;
  raise notice 'OK cliente A: não altera a linha de B';

  begin
    insert into clientes (tipo, nome, documento, email, auth_user_id)
    values ('PF', 'x', 'tst-ident-x', 'x@exemplo.invalid', current_setting('teste.user_a')::uuid);
    raise exception 'FALHA cliente A: conseguiu INSERIR em clientes';
  exception when insufficient_privilege then
    raise notice 'OK cliente A: não insere em clientes';
  end;

  begin
    delete from clientes where id = a;
    raise exception 'FALHA cliente A: DELETE em clientes não foi barrado por privilégio (a 0033 foi aplicada?)';
  exception when insufficient_privilege then
    raise notice 'OK cliente A: não exclui linha de clientes';
  end;

  -- APPSEC-018 (camada do banco): pedido de B.
  select count(*) into n from pedidos where id = pedido_b;
  if n <> 0 then raise exception 'FALHA cliente A: vê o pedido de B'; end if;
  select count(*) into n from pedido_itens where pedido_id = pedido_b;
  if n <> 0 then raise exception 'FALHA cliente A: vê os itens do pedido de B'; end if;
  raise notice 'OK cliente A: não vê o pedido nem os itens de B';

  begin
    update pedidos set status = 'pago' where id = pedido_b;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FALHA cliente A: ALTEROU o pedido de B'; end if;
    raise notice 'OK cliente A: não altera o pedido de B';
  exception when insufficient_privilege then
    raise notice 'OK cliente A: não altera o pedido de B';
  end;

  begin
    insert into pedidos (cliente_id, status, total, forma_pagamento, frete_valor) values (b, 'pago', 1, 'pix', 0);
    raise exception 'FALHA cliente A: conseguiu CRIAR pedido em nome de B';
  exception when insufficient_privilege then
    raise notice 'OK cliente A: não cria pedido direto no banco';
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 2. CLIENTE B — controle: prova que a simulação do JWT funciona
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', current_setting('teste.user_b'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('teste.user_b'), true);
set local role authenticated;

do $$
declare
  n bigint;
begin
  select count(*) into n from pedidos where id = current_setting('teste.pedido_b')::uuid;
  if n <> 1 then raise exception 'FALHA controle: o cliente B não vê o próprio pedido — a simulação do JWT não está funcionando'; end if;
  raise notice 'OK cliente B: vê o próprio pedido (controle do teste)';

  select count(*) into n from clientes;
  if n <> 1 then raise exception 'FALHA cliente B: vê % linha(s) de clientes, esperado 1', n; end if;
  raise notice 'OK cliente B: vê só a própria linha de clientes';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 3. ANÔNIMO — nada em clientes
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  n bigint;
begin
  begin
    select count(*) into n from clientes;
    if n <> 0 then raise exception 'FALHA anon: vê % linha(s) de clientes', n; end if;
    raise exception 'FALHA anon: SELECT em clientes não foi barrado por privilégio (a 0033 foi aplicada?)';
  exception when insufficient_privilege then
    raise notice 'OK anon: sem acesso a clientes';
  end;

  begin
    update clientes set nome = nome where id = current_setting('teste.cliente_a')::uuid;
    raise exception 'FALHA anon: UPDATE em clientes não foi barrado por privilégio';
  exception when insufficient_privilege then
    raise notice 'OK anon: não altera clientes';
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 4. ADMIN — vê tudo; pela API edita as mesmas colunas que o cliente
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', current_setting('teste.admin_id'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('teste.admin_id'), true);
set local role authenticated;

do $$
declare
  n bigint;
  a uuid := current_setting('teste.cliente_a')::uuid;
begin
  if current_setting('teste.admin_id') = '' then
    raise notice 'PULADO admin: a tabela "admins" está vazia';
    return;
  end if;
  if not is_admin() then raise exception 'FALHA: o admin de teste não foi reconhecido por is_admin()'; end if;

  select count(*) into n from clientes;
  if n <> current_setting('teste.clientes_total')::bigint then
    raise exception 'FALHA admin: vê % cliente(s), esperado % (todos)', n, current_setting('teste.clientes_total');
  end if;
  raise notice 'OK admin: vê todos os clientes (%)', n;

  update clientes set nome = 'Teste A (admin)' where id = a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA admin: não conseguiu editar o nome de um cliente'; end if;
  raise notice 'OK admin: edita nome de cliente';

  begin
    update clientes set documento = documento where id = a;
    raise exception 'FALHA admin: alterou documento pela API — esperado bloqueio (0033)';
  exception when insufficient_privilege then
    raise notice 'OK admin: documento não é editável pela API (o painel não edita "clientes")';
  end;

  select count(*) into n from pedidos where id = current_setting('teste.pedido_b')::uuid;
  if n <> 1 then raise exception 'FALHA admin: não vê o pedido de B'; end if;
  raise notice 'OK admin: vê pedidos de qualquer cliente';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 5. Estrutura: privilégios e índice únicos
-- ---------------------------------------------------------------------------
do $$
declare
  colunas text;
  indevidos text;
begin
  select string_agg(column_name::text, ', ' order by column_name::text collate "C") into colunas
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'clientes'
    and grantee = 'authenticated' and privilege_type = 'UPDATE';

  if colunas is distinct from 'endereco_bairro, endereco_cep, endereco_cidade, endereco_complemento, endereco_numero, endereco_rua, endereco_uf, nome, telefone' then
    raise exception 'FALHA estrutura: authenticated pode alterar as colunas [%]', colunas;
  end if;
  raise notice 'OK estrutura: cliente só altera %', colunas;

  select string_agg(grantee::text || ':' || privilege_type::text, ', ') into indevidos
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'clientes'
    and (grantee = 'anon' or (grantee = 'authenticated' and privilege_type <> 'SELECT'));

  if indevidos is not null then raise exception 'FALHA estrutura: privilégios de tabela indevidos em clientes: %', indevidos; end if;
  raise notice 'OK estrutura: anon sem privilégio; authenticated só SELECT na tabela';

  if exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'clientes' and indexname = 'uq_clientes_documento_normalizado') then
    raise notice 'OK estrutura: índice único de documento ativo';
  else
    raise notice 'ATENÇÃO: índice uq_clientes_documento_normalizado NÃO existe — a 0034 foi pulada por duplicados? Rode a V-5.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Limpeza extra (só importa se o editor não respeitar a transação) e ROLLBACK
-- ---------------------------------------------------------------------------
delete from pedido_itens where pedido_id = current_setting('teste.pedido_b')::uuid;
delete from pedidos where id = current_setting('teste.pedido_b')::uuid;
delete from clientes where documento in ('tst-ident-a', 'tst-ident-b', 'tst-ident-x');
delete from auth.users where email like 'teste-identidade-%@exemplo.invalid';

rollback;
