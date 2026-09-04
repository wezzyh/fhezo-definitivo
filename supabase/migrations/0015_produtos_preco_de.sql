-- Campo opcional de "preço de" (valor riscado) para exibir desconto
-- "de/por" na loja pública — parte da integração do novo visual público
-- (referencia-novo-frontend/). "preco" (coluna já existente) continua
-- sendo o preço "por" (o que o cliente paga); "preco_de" só existe pra
-- mostrar um comparativo, não afeta cálculo de pedido/estoque/frete.
-- Quando nulo (padrão), o produto aparece sem selo/risco, como sempre.

alter table produtos add column if not exists preco_de numeric null;

comment on column produtos.preco_de is 'Preço "de" (riscado), opcional, só para exibição de desconto na loja. Null = sem desconto exibido. O preço real cobrado continua sendo "preco".';
