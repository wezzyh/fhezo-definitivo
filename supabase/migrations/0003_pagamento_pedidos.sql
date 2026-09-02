-- Bloco 3 (parte final): pagamento via Asaas e gravação definitiva do
-- pedido. Sem essas colunas o pedido pago não teria como ser expedido (não
-- há telefone de contato nem endereço de entrega salvos) nem conciliado com
-- o Asaas (não há onde guardar o ID da cobrança).

-- "clientes": telefone de contato (usado no cadastro do customer no Asaas
-- e para contato sobre o pedido).
alter table clientes
  add column if not exists telefone text;

-- "pedidos": forma de pagamento escolhida, cobrança correspondente no
-- Asaas, frete escolhido e endereço de entrega.
alter table pedidos
  add column if not exists forma_pagamento text,
  add column if not exists asaas_payment_id text,
  add column if not exists frete_valor numeric(10, 2),
  add column if not exists frete_transportadora text,
  add column if not exists endereco_cep text,
  add column if not exists endereco_rua text,
  add column if not exists endereco_numero text,
  add column if not exists endereco_complemento text,
  add column if not exists endereco_bairro text,
  add column if not exists endereco_cidade text,
  add column if not exists endereco_uf text;

-- Único (parcial, ignora nulos) porque o webhook do Asaas busca o pedido
-- por esse ID para atualizar o status — não pode haver duplicidade.
create unique index if not exists idx_pedidos_asaas_payment_id
  on pedidos (asaas_payment_id)
  where asaas_payment_id is not null;

comment on column pedidos.forma_pagamento is 'pix | boleto | cartao';
comment on column pedidos.asaas_payment_id is 'ID da cobrança (payment) correspondente no Asaas.';
