-- Integração com o Bling (ERP). Reaproveita a tabela "integracoes" já
-- existente (mesmo padrão OAuth do Melhor Envio) — basta um novo registro
-- com provedor = 'bling', sem nenhuma alteração de schema nela.

-- "produtos": referência cruzada para o produto correspondente no Bling.
-- Preenchida pela sincronização de estoque (SKU local == código no Bling).
alter table produtos
  add column if not exists bling_produto_id bigint;

comment on column produtos.bling_produto_id is 'ID do produto correspondente no Bling — usado para sincronizar estoque e montar itens de pedido de venda.';

-- "pedidos": referência ao pedido de venda criado no Bling, e visibilidade
-- de falhas de sincronização (o pagamento já foi confirmado nesse ponto —
-- uma falha aqui nunca deve reverter isso, só ficar visível pro admin).
alter table pedidos
  add column if not exists bling_pedido_id bigint,
  add column if not exists bling_sincronizado boolean not null default false,
  add column if not exists bling_erro_sincronizacao text;

comment on column pedidos.bling_pedido_id is 'ID do pedido de venda correspondente no Bling.';
comment on column pedidos.bling_sincronizado is 'true quando este pedido pago foi enviado ao Bling com sucesso.';
comment on column pedidos.bling_erro_sincronizacao is 'Última mensagem de erro ao tentar enviar este pedido ao Bling (null quando sincronizado ou ainda não tentado).';

-- Acelera a consulta do admin "pedidos pagos que falharam ao sincronizar".
create index if not exists idx_pedidos_bling_pendentes
  on pedidos (status)
  where status = 'pago' and bling_sincronizado = false;
