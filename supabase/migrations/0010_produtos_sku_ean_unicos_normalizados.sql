-- "sku" já é UNIQUE em produtos, mas essa constraint é sensível a
-- maiúsculas/minúsculas e não ignora espaços nas pontas: "ROL-123",
-- "rol-123" e " ROL-123 " contam como três valores DIFERENTES pro
-- Postgres, apesar de serem o mesmo SKU pra um humano — essa é a brecha
-- que permitia "SKU duplicado" apesar do unique constraint existente.
-- "ean" nunca teve nenhuma restrição de unicidade.
--
-- A validação equivalente (mesma normalização: trim + minúsculas) foi
-- adicionada no formulário do admin — ver src/lib/produtos/duplicatas.ts,
-- usado em src/app/admin/produtos/actions.ts — pra dar uma mensagem de
-- erro clara ali. Estes índices são a segunda camada de defesa, direto no
-- banco, contra qualquer caminho que não passe por aquela validação (ex.:
-- um insert futuro via Bling ou script administrativo).
--
-- Seguros de rodar contra os dados de hoje: os 3 produtos existentes têm
-- SKUs distintos (mesmo normalizados) e nenhum tem EAN preenchido.
create unique index if not exists idx_produtos_sku_normalizado
  on produtos (lower(trim(sku)));

-- Índice único PARCIAL: ignora produtos sem EAN (campo opcional — a
-- maioria dos produtos não tem), mas impede dois produtos com o mesmo EAN
-- (normalizado do mesmo jeito que o sku acima).
create unique index if not exists idx_produtos_ean_normalizado
  on produtos (lower(trim(ean)))
  where ean is not null and trim(ean) <> '';
