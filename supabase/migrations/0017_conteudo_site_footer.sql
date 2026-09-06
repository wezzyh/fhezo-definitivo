-- Adiciona "footer" como um tipo válido de conteudo_site (mesma
-- arquitetura de menu/home/tema — documento inteiro versionado por linha,
-- ver migration 0012). Guarda as imagens de forma de pagamento e selos de
-- segurança do rodapé do site, editáveis em /admin/conteudo/footer.
-- Formato de "dados": ver DadosFooter em src/lib/conteudo/tipos.ts.
alter table conteudo_site drop constraint conteudo_site_tipo_check;
alter table conteudo_site add constraint conteudo_site_tipo_check
  check (tipo in ('menu', 'home', 'tema', 'footer'));

comment on column conteudo_site.tipo is 'Um de: ''menu'', ''home'', ''tema'', ''footer''. Formato de "dados" depende do tipo — ver src/lib/conteudo/tipos.ts.';

-- Sem seed: diferente de menu/home/tema (que espelhavam conteúdo já
-- hardcoded no código), "footer" é a primeira vez que essas imagens
-- existem no site — não há nada pra migrar. A tabela simplesmente não tem
-- nenhuma versão publicada de tipo 'footer' até o admin publicar uma pela
-- primeira vez; o site trata isso como "nenhuma imagem cadastrada ainda"
-- (ver FOOTER_PADRAO em src/lib/conteudo/padroes.ts), sem quebrar.
