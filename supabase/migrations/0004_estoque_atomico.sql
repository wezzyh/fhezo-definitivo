-- Desconto/reversão atômica de estoque no checkout.
--
-- Problema: ler o estoque em JS, subtrair e salvar de volta tem race
-- condition — dois clientes finalizando a compra da última unidade ao
-- mesmo tempo podem os dois "ver" estoque disponível e os dois venderem.
--
-- Solução: um UPDATE condicional é atômico no Postgres (o próprio banco
-- serializa updates concorrentes na mesma linha). `descontar_estoque` só
-- desconta se `estoque >= quantidade` no momento exato do UPDATE, e
-- devolve se conseguiu ou não — sem essa checagem em duas etapas separadas.

create or replace function descontar_estoque(produto_id uuid, quantidade integer)
returns boolean
language plpgsql
as $$
declare
  linhas_afetadas integer;
begin
  update produtos
  set estoque = estoque - quantidade
  where id = produto_id and estoque >= quantidade;

  get diagnostics linhas_afetadas = row_count;
  return linhas_afetadas > 0;
end;
$$;

-- Devolve estoque descontado (falha ao criar a cobrança no Asaas depois do
-- desconto, ou cancelamento/estorno de um pedido já pago).
create or replace function reverter_estoque(produto_id uuid, quantidade integer)
returns void
language plpgsql
as $$
begin
  update produtos
  set estoque = estoque + quantidade
  where id = produto_id;
end;
$$;

-- Só o código de servidor confiável do checkout chama essas funções (via
-- service_role, ver src/lib/supabase/admin.ts) — nunca o navegador. Sem
-- essa restrição, qualquer pessoa com a chave "anon" do projeto poderia
-- chamar `descontar_estoque` diretamente pela API do Supabase e zerar o
-- estoque de um produto sem nunca ter feito um pedido de verdade.
revoke execute on function descontar_estoque(uuid, integer) from public;
revoke execute on function reverter_estoque(uuid, integer) from public;
grant execute on function descontar_estoque(uuid, integer) to service_role;
grant execute on function reverter_estoque(uuid, integer) to service_role;
