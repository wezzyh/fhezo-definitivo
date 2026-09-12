-- APPSEC-001 — frete controlado pelo navegador.
--
-- O bug: criarPedido somava ao total o frete mandado pelo navegador — frete
-- negativo abatia o preço dos produtos. A correção principal é no servidor
-- (src/lib/checkout/frete-pedido.ts recalcula o frete no Melhor Envio);
-- esta migração é a última linha de defesa no banco.
--
-- ---------------------------------------------------------------------------
-- ANTES de rodar, veja se já existem pedidos que violam as regras. Se a
-- migração encontrar algum, ela NÃO cria a constraint correspondente e só
-- avisa — nenhum pedido histórico é apagado ou alterado automaticamente:
--
--   select id, status, total, frete_valor, frete_transportadora, created_at
--   from pedidos
--   where frete_valor < 0 or total is null or total <= 0
--   order by created_at;
--
-- Pedido com frete negativo NÃO é bug de teste: pode ser exploração do
-- APPSEC-001. Confira no Asaas quanto foi realmente pago antes de separar ou
-- enviar a mercadoria. Depois de resolver cada caso (cancelar, corrigir o
-- valor com o cliente etc.), rode esta migração de novo — ela é idempotente.
-- ---------------------------------------------------------------------------

-- 1. pedidos.frete_valor >= 0 (null continua permitido — pedidos antigos).
do $$
declare
  invalidos bigint;
begin
  if exists (select 1 from pg_constraint where conname = 'pedidos_frete_valor_nao_negativo') then
    return;
  end if;

  select count(*) into invalidos from pedidos where frete_valor < 0;
  if invalidos > 0 then
    raise notice 'pedidos: % pedido(s) com frete_valor negativo — constraint NÃO criada. Veja a consulta no topo do arquivo.', invalidos;
  else
    alter table pedidos add constraint pedidos_frete_valor_nao_negativo check (frete_valor >= 0);
  end if;
end $$;

-- 2. pedidos.total > 0
do $$
declare
  invalidos bigint;
begin
  if exists (select 1 from pg_constraint where conname = 'pedidos_total_positivo') then
    return;
  end if;

  select count(*) into invalidos from pedidos where total is null or total <= 0;
  if invalidos > 0 then
    raise notice 'pedidos: % pedido(s) com total nulo, zero ou negativo — constraint NÃO criada. Veja a consulta no topo do arquivo.', invalidos;
  else
    alter table pedidos add constraint pedidos_total_positivo check (total > 0);
  end if;
end $$;

-- Verificação: as duas constraints devem aparecer (se não houve aviso).
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conname in ('pedidos_frete_valor_nao_negativo', 'pedidos_total_positivo');
