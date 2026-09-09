-- Imagem opcional por categoria, exibida no círculo da faixa de categorias
-- da home (substitui o fallback "círculo com a letra inicial" quando
-- cadastrada). Mesmo bucket "admin-imagens" já usado por produtos/banners/
-- footer (ver migration 0016), pasta "categorias".
alter table categorias add column if not exists imagem_url text null;

comment on column categorias.imagem_url is 'URL pública da imagem da categoria (bucket admin-imagens, pasta "categorias"). Null = sem imagem cadastrada, exibe fallback (círculo com a letra inicial do nome).';
