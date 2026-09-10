-- Adiciona "contato" como um tipo válido de conteudo_site (mesma
-- arquitetura de menu/home/tema/footer/seo — documento inteiro versionado
-- por linha, ver migration 0012). Guarda telefone, WhatsApp, e-mail,
-- endereço, horário e redes sociais — hoje hardcoded em
-- src/lib/conteudo/contato-fixo.ts e usado tanto no Header quanto no
-- Footer, sem nenhum lugar único pra editar. Editável em
-- /admin/conteudo/contato.
alter table conteudo_site drop constraint conteudo_site_tipo_check;
alter table conteudo_site add constraint conteudo_site_tipo_check
  check (tipo in ('menu', 'home', 'tema', 'footer', 'seo', 'contato'));

comment on column conteudo_site.tipo is 'Um de: ''menu'', ''home'', ''tema'', ''footer'', ''seo'', ''contato''. Formato de "dados" depende do tipo — ver src/lib/conteudo/tipos.ts.';

-- Sem seed: os valores atuais (ver CONTATO_PADRAO em
-- src/lib/conteudo/padroes.ts, cópia exata do antigo contato-fixo.ts) já
-- cobrem o fallback enquanto o admin não publica nenhuma versão.
