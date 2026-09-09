-- Adiciona "seo" como um tipo válido de conteudo_site (mesma arquitetura
-- de menu/home/tema/footer — documento inteiro versionado por linha, ver
-- migration 0012). Guarda título/descrição de buscadores para Home e
-- listagem de produtos (/produtos), editáveis em /admin/conteudo/seo.
-- Páginas institucionais têm seo_titulo/seo_descricao na própria linha
-- (migration 0021), não aqui — produto já tinha os campos próprios desde
-- a migration 0009.
alter table conteudo_site drop constraint conteudo_site_tipo_check;
alter table conteudo_site add constraint conteudo_site_tipo_check
  check (tipo in ('menu', 'home', 'tema', 'footer', 'seo'));

comment on column conteudo_site.tipo is 'Um de: ''menu'', ''home'', ''tema'', ''footer'', ''seo''. Formato de "dados" depende do tipo — ver src/lib/conteudo/tipos.ts.';

-- Sem seed: os textos atuais (ver SEO_PADRAO em src/lib/conteudo/padroes.ts)
-- já cobrem o fallback enquanto o admin não publica nenhuma versão.
