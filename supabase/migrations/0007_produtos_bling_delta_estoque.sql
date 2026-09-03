-- Guarda o último valor de estoque VISTO no Bling na última sincronização
-- (não é o estoque local — é só o que o Bling reportava naquele momento).
--
-- Necessário para a sincronização não apagar vendas feitas no site: o
-- Bling só deduz estoque na emissão de NF-e / mudança de situação do
-- pedido, ainda não implementadas aqui — então comparar o valor do Bling
-- direto contra o estoque local atual não funciona (o valor do Bling é
-- quase sempre "maior" que o local depois de uma venda local, porque o
-- Bling nunca soube da venda). Comparando contra o ÚLTIMO valor que já
-- vimos do Bling, dá pra aplicar só o que aumentou de verdade lá
-- (reposição/entrada de mercadoria), sem tocar em quedas causadas por
-- vendas locais que o Bling ainda não sabe que aconteceram.
alter table produtos
  add column if not exists bling_estoque_ultimo_sincronizado integer;

comment on column produtos.bling_estoque_ultimo_sincronizado is
  'Último saldoVirtualTotal visto no Bling numa sincronização — usado só para calcular o delta de reposição, não é o estoque local.';
