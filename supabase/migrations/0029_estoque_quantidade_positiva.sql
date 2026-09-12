-- APPSEC-002 — quantidade negativa/zero no checkout.
--
-- O bug: descontar_estoque(produto, -9) passava na condição
-- "estoque >= quantidade" (sempre verdadeira para negativo) e fazia
-- "estoque - (-9)", ou seja, AUMENTAVA o estoque — e o item negativo ainda
-- abatia o total do pedido. A validação principal agora é no servidor
-- (src/lib/checkout/validar-pedido.ts); esta migração é a última linha de
-- defesa no banco.
--
-- ---------------------------------------------------------------------------
-- ANTES de rodar, confira se já existem dados que violam as regras (se a
-- migração encontrar algum, ela NÃO cria a constraint correspondente e só
-- avisa — nada é apagado ou alterado automaticamente):
--
--   select id, pedido_id, produto_id, quantidade from pedido_itens where quantidade is null or quantidade <= 0;
--   select id, sku, nome, estoque from produtos where estoque < 0;
--
-- Se aparecer linha, decida caso a caso (corrigir o estoque do produto no
-- admin; investigar o pedido — pode ser uma exploração do APPSEC-002) e
-- rode esta migração de novo: ela é idempotente.
-- ---------------------------------------------------------------------------

-- 1. Funções de estoque: recusam quantidade nula, zero ou negativa.
--    Mesma assinatura, então os privilégios definidos na 0004 (execute só
--    para service_role) são mantidos pelo "create or replace"; são
--    reaplicados no fim por garantia.
create or replace function descontar_estoque(produto_id uuid, quantidade integer)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  linhas_afetadas integer;
begin
  if quantidade is null or quantidade <= 0 then
    raise exception 'descontar_estoque: quantidade inválida (%)', quantidade using errcode = '22023';
  end if;

  update produtos
  set estoque = estoque - quantidade
  where id = produto_id and estoque >= quantidade;

  get diagnostics linhas_afetadas = row_count;
  return linhas_afetadas > 0;
end;
$$;

create or replace function reverter_estoque(produto_id uuid, quantidade integer)
returns void
language plpgsql
set search_path = public
as $$
begin
  -- Reverter uma quantidade negativa DIMINUIRIA o estoque.
  if quantidade is null or quantidade <= 0 then
    raise exception 'reverter_estoque: quantidade inválida (%)', quantidade using errcode = '22023';
  end if;

  update produtos
  set estoque = estoque + quantidade
  where id = produto_id;
end;
$$;

revoke execute on function descontar_estoque(uuid, integer) from public;
revoke execute on function reverter_estoque(uuid, integer) from public;
grant execute on function descontar_estoque(uuid, integer) to service_role;
grant execute on function reverter_estoque(uuid, integer) to service_role;

-- 2. pedido_itens.quantidade > 0 — só cria se não houver linha inválida.
do $$
declare
  invalidos bigint;
begin
  if exists (select 1 from pg_constraint where conname = 'pedido_itens_quantidade_positiva') then
    return;
  end if;

  select count(*) into invalidos from pedido_itens where quantidade is null or quantidade <= 0;
  if invalidos > 0 then
    raise notice 'pedido_itens: % linha(s) com quantidade <= 0 — constraint NÃO criada. Veja a consulta no topo do arquivo.', invalidos;
  else
    alter table pedido_itens add constraint pedido_itens_quantidade_positiva check (quantidade > 0);
  end if;
end $$;

-- 3. produtos.estoque >= 0 — só cria se não houver produto com estoque negativo.
--    Todo caminho que grava estoque já garante >= 0 (formulário e edição em
--    massa do admin, importação CSV/XLSX, sincronização do Bling com
--    Math.max(0, ...), checkout via descontar_estoque). Mas se existir uma
--    linha negativa antiga, qualquer UPDATE nela passaria a falhar — por
--    isso a checagem antes.
do $$
declare
  invalidos bigint;
begin
  if exists (select 1 from pg_constraint where conname = 'produtos_estoque_nao_negativo') then
    return;
  end if;

  select count(*) into invalidos from produtos where estoque < 0;
  if invalidos > 0 then
    raise notice 'produtos: % produto(s) com estoque negativo — constraint NÃO criada. Corrija o estoque deles e rode de novo.', invalidos;
  else
    alter table produtos add constraint produtos_estoque_nao_negativo check (estoque >= 0);
  end if;
end $$;

-- Verificação: as duas constraints devem aparecer (se não houve aviso).
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conname in ('pedido_itens_quantidade_positiva', 'produtos_estoque_nao_negativo');
