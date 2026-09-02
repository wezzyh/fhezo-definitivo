-- Bloco 3: adiciona peso e dimensões em "produtos", usados no cálculo de
-- frete (Melhor Envio). Valores default razoáveis para produtos já
-- cadastrados; ajuste depois pelo painel admin conforme o produto real.

alter table produtos
  add column if not exists peso_kg double precision not null default 1,
  add column if not exists altura_cm double precision not null default 10,
  add column if not exists largura_cm double precision not null default 10,
  add column if not exists comprimento_cm double precision not null default 10;
