# Handoff — Loja Fhezo

Documento de contexto pra qualquer IA (ou humano) que for mexer neste projeto depois. Foco em **o que já existe e por quê**, não em como usar Next.js/Supabase em geral. Escrito em pt-BR de propósito — todo o código, comentários e UI do projeto também são.

Verificado contra o banco de produção real em 2026-09-03 (não é só o que os arquivos de migration *deveriam* fazer — várias vezes nesta conversa a suposição "ainda não rodou" estava errada; sempre vale reconferir com uma query antes de assumir).

## ⚠️ Incidente do rebase de 2026-09-09 (leia antes de confiar no histórico)

Em 2026-09-09 um `git pull --rebase origin main` juntou o trabalho local desta
máquina (commit `be8e0ab`, feito ao longo do dia 09/09) com commits vindos da
outra máquina (`c2b622a`, `29e72c6`, de 06/09). O rebase teve **dois conflitos**
e a resolução deles descartou silenciosamente parte do trabalho de 09/09,
substituindo-o pela versão mais antiga de 06/09. Os commits resultantes
(`72e0409`..`42a7e83`) parecem íntegros no `git log` — a perda só aparece
comparando com o commit pré-rebase.

**Como auditar isso de novo, se desconfiar de sumiço:** o commit pré-rebase
continua acessível como dangling object. Use

```
git range-diff 240838e..be8e0ab 29e72c6..42a7e83     # commit a commit
git diff be8e0ab HEAD --stat -- src/ supabase/       # o que mudou de fato
```

Se `be8e0ab` já tiver sido coletado pelo gc, procure em `git reflog` /
`git fsck --lost-found`.

**O que foi perdido e já está restaurado (2026-09-10):**

- `src/app/admin/conteudo/footer/editor-footer.tsx` — o layout compacto (lista
  vertical `flex max-w-md flex-col`, `UploadImagem compacto`, legenda inline)
  tinha virado um grid de 3 colunas com dropzones gigantes. Restaurado do
  `be8e0ab`.
- `src/components/layout/footer.tsx` — ícones de forma de pagamento voltaram de
  `h-[35px]`/`gap-x-3` pra `h-[22px]`/`gap-x-5`. Restaurado.
- `src/lib/conteudo/tipos.ts` — `ImagemFooter` e `DadosFooter` ficaram
  **declarados duas vezes**, coladas uma embaixo da outra. Isso NÃO quebra o
  `tsc` (interfaces TS com membros idênticos fazem declaration merging), então
  passou despercebido. Bloco duplicado removido.

**O que NÃO foi perdido** (conferido, não presumido): toda a integração com o
Bling (`72e0409`, `2cb59b7`, `890ca4d`), lupa de zoom e lightbox da galeria
(`2733db1`, `d9d2cb6`), e tudo que veio da outra máquina. A remoção de
`src/app/(site)/carrinho/page.tsx` é intencional (drawer, Etapa 3).

### Regressão separada, do próprio commit `42a7e83` (não do rebase)

A barra de categorias do topo do header deixou de renderizar `arvoreCategorias`
(categorias reais, href sempre válido) e passou a renderizar `dadosMenu.itens`
(CMS, `/admin/conteudo/menu`). O menu publicado tinha hrefs digitados à mão
(`/rolamentos`, `/mancais`, ...) — **rotas que não existem neste app**, então
todo clique em categoria virou 404.

Corrigido em 2026-09-10 **no dado, não no código**: publicada a versão 7 do
`conteudo_site` tipo `menu` (via a própria RPC `publicar_conteudo_site`, então
o histórico está intacto e dá pra restaurar a v6 pelo admin). Os 8 itens com
categoria correspondente viraram `tipo: "categoria"` + `categoria_id` — o href
passa a ser resolvido em runtime pelo slug (`resolverHrefItemMenu`), que é
exatamente o desenho pretendido e não quebra mais se o slug mudar. "Polias" e
"Correias" **não existem como categoria** e ficaram apontando pra `/produtos`;
crie as categorias e religue esses dois itens em `/admin/conteudo/menu` quando
fizer sentido.

**Lição pro próximo rebase deste repo:** este projeto é editado em duas máquinas
que divergem com frequência e mexem nos mesmos arquivos de UI. Depois de
qualquer `pull --rebase` com conflito, rode o `git range-diff` acima antes de
commitar — o `tsc`/`build` passando não prova que nada sumiu.

## O que é

E-commerce B2B de componentes industriais (rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos). Next.js 16 (App Router) + Supabase (Postgres + Auth) + Tailwind v4. Um único usuário admin (sem multi-tenant, sem roles ainda — ver TODO espalhado pelo código).

Integrações externas: **Asaas** (pagamento — Pix/boleto/cartão), **Melhor Envio** (frete), **Bling** (ERP — estoque e pedidos de venda).

## Como rodar / testar coisas

- `.env.local` tem as chaves reais do Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) — **não existe banco de staging separado**, é o mesmo projeto sempre. Qualquer teste que escreva dado real deve limpar depois (padrão usado nesta conversa: script `.mjs` temporário na raiz, roda com `node`, deletado ao final).
- Server Actions/libs que usam `import "server-only"` não rodam em `node` puro nem em `tsx` direto — o pacote `server-only` lança erro fora do bundler do Next. Pra testar essas funções isoladamente: `NODE_OPTIONS='--conditions=react-server' npx tsx arquivo.mjs`.
- `npx tsc --noEmit`, `npm run build`, `npx eslint <caminho>` — os três rodam limpos hoje. Rode os três antes de considerar qualquer mudança pronta.
- O eslint deste projeto (via `eslint-config-next`) inclui a regra `react-hooks/purity`, que barra `Date.now()`/`new Date()` chamado direto no corpo de um componente (mesmo em Server Component). Solução já usada: `src/lib/data/tempo.ts` isola essas chamadas numa função comum importada.

## Banco de dados — estado atual (todas as migrations 0001–0011 já aplicadas)

Migrations ficam em `supabase/migrations/`, aplicadas manualmente pelo usuário no SQL Editor do Supabase (não há CLI/link configurado, não têm sido rodadas por mim automaticamente). O schema base (`produtos`, `clientes`, `pedidos`, `pedido_itens`) foi criado direto no Supabase antes de existir controle de migration — não tem arquivo `0000_...sql` correspondente.

### `produtos`
`id, sku (unique), nome, descricao, atributos (jsonb), preco, estoque, ativo, peso_kg, altura_cm, largura_cm, comprimento_cm, bling_produto_id, bling_estoque_ultimo_sincronizado, marca_id, categoria_id, ean, ncm, seo_titulo, seo_descricao, imagem_url, created_at`

- `categoria` (texto livre) **não existe mais** — migrada pra `categoria_id` (0009). `marca_id` é obrigatório desde sempre (produtos antigos foram pra "Sem marca").
- Índices únicos **normalizados** (`lower(trim(sku))`, `lower(trim(ean)) where ean is not null`) além do `unique(sku)` simples — o unique simples sozinho deixava passar duplicata por maiúsculas/espaço (`ROL-123` vs `rol-123 `). Ver `src/lib/produtos/duplicatas.ts` pra validação equivalente no app.
- `imagem_url` é uma coluna simples (não uma tabela `produto_imagens`) — decisão deliberada: só existe "1 imagem principal" hoje, e o projeto não tem bucket de storage configurado (o campo é uma URL externa, não upload de arquivo).
- RLS: `anon` só vê `ativo = true`; `authenticated` vê tudo.

### `marcas` / `categorias`
Entidades próprias (não texto livre) desde a migration 0009. `categorias` tem `categoria_pai_id` pra hierarquia simples (1 nível de profundidade testado, mas o código em `src/lib/categorias/hierarquia.ts` suporta N níveis). Ambas têm `ativo` — o admin só ativa/desativa, **nunca exclui** (produtos referenciam via FK `on delete restrict`, e propositalmente não existe política RLS de delete).

"Sem marca" / "Sem categoria" são registros normais nessas tabelas (não um caso especial no código) — usados como padrão quando o Bling cria produto novo sem informação suficiente. Resolvidos via `src/lib/produtos/padroes.ts` (`obterOuCriarX` cria se não existir; `buscarIdXPadrao` só lê, usado em contextos read-only como o dashboard).

### `pedidos`
`id, cliente_id, status, total, forma_pagamento, asaas_payment_id, frete_valor, frete_transportadora, endereco_* (snapshot no momento da compra), bling_pedido_id, bling_sincronizado, bling_erro_sincronizacao, created_at`

- **`status`** é um enum único que cobre pagamento E envio: `pendente → pago → em_separacao → enviado → entregue`, com `cancelado` como ramo terminal alternativo. **Não existe (nem foi criada) uma coluna `status_envio` separada** — decisão deliberada ao implementar a Central de ações do dashboard: os valores `em_separacao`/`enviado`/`entregue` já existiam no enum desde o início mas nunca eram usados; criar uma segunda coluna paralela só geraria dois status pra manter sincronizados.
- Só `pendente → pago → cancelado` são automáticos, via webhook do Asaas (`src/lib/pagamento/pedidos.ts`, `mapearStatusAsaasParaPedido`). `em_separacao/enviado/entregue` são setados manualmente em `/admin/pedidos` (`src/app/admin/pedidos/actions.ts`), **restrito de propósito** a só esses três valores — a action rejeita tentativa de setar `pendente/pago/cancelado` por ali, porque esses são território exclusivo do webhook do Asaas (que também reverte estoque ao cancelar; deixar duas rotas mexerem nisso arriscava reversão duplicada).
- `bling_erro_sincronizacao` já existia antes desta rodada de trabalho — é a "fonte de verdade" pra saber que pedido pago falhou ao ir pro Bling (visível no dashboard, com botão de reenvio).

### `integracoes`
`id, provedor (unique: 'melhor_envio' | 'bling'), access_token, refresh_token, expira_em, ultima_sincronizacao, created_at, updated_at`

- Token OAuth de cada integração. `obterTokenValido{Bling,MelhorEnvio}` (em `src/lib/integracoes/{bling,melhorenvio}.ts`) renova sozinho via refresh_token quando `expira_em` já passou, e persiste o novo token. **`expira_em` no passado não significa "integração quebrada"** — o access_token é de curta duração por design, vence sozinho entre usos e é renovado transparentemente na próxima chamada real. O sinal confiável de "quebrado" é `obterTokenValido...` devolver `null` (renovação tentada e falhou de verdade — refresh_token inválido/revogado). O dashboard usa exatamente essa chamada, não uma comparação de data (ver seção Dashboard abaixo).

### `eventos_integracao` (nova — migration 0011)
`id, provedor ('asaas' | 'bling'), evento (texto livre, ex: 'webhook_pagamento', 'sincronizar_estoque'), sucesso (bool), mensagem_erro, created_at`

Log de falhas que **antes desta rodada de trabalho não ficavam registradas em lugar nenhum** — nem no banco, nem em `console.error` (o projeto inteiro não tinha um único `console.error` até então). Cobre especificamente: falha ao processar webhook do Asaas, e falha ao criar produto durante a sincronização de estoque do Bling. **Não duplica** `pedidos.bling_erro_sincronizacao` (falha ao enviar PEDIDO pro Bling já tinha seu próprio lugar). Gravado via `registrarEventoIntegracao` (`src/lib/integracoes/eventos.ts`) — melhor esforço, nunca derruba o fluxo principal se a própria gravação falhar. Consultável em `/admin/eventos`.

**Lacuna conhecida, sem solução ainda**: não existe campo "resolvido" — a contagem no dashboard só considera os últimos 7 dias (`DIAS_EVENTOS_RECENTES` em `src/app/admin/page.tsx`) pra não crescer pra sempre sem nunca "zerar". Se isso incomodar, a evolução natural é um botão de marcar-como-resolvido.

## Domínios principais

### Produtos (`src/app/admin/produtos/`, `src/lib/produtos/`)

- **CRUD normal**: `page.tsx` (listagem paginada de verdade — `.range()` + `count: 'exact'`, 50/página), `formulario-produto.tsx` (client, com criação inline de marca/categoria sem sair da tela via `criarMarcaRapida`/`criarCategoriaRapida`), `actions.ts`.
- **Score de qualidade** (`src/lib/produtos/qualidade.ts`): 0–100%, pesos acordados com o usuário — imagem 20, peso/dimensão real 15, SEO 15 (7,5+7,5), marca 10, categoria 10, EAN 10, NCM 10, descrição (≥20 caracteres) 10. Calculado em memória a partir de colunas já carregadas — não é uma coluna no banco.
- **Filtros de problema** (`src/lib/produtos/filtros.ts`): "Sem imagem", "Sem peso/dimensão real", "Sem marca", "Sem categoria", "Sem SEO", "Estoque negativo", "SKU duplicado", "EAN duplicado" — combinam com **OU** entre si (decisão deliberada: E daria conjunto vazio na maioria das combinações; o caso de uso é triagem ampla "o que precisa de atenção", não busca cirúrgica). Empurrados pra dentro da query via `.or()` do PostgREST, inclusive os dois de duplicata (resolvidos numa varredura leve `id, sku, ean` de toda a tabela — a única consulta que ainda cresce com o total de produtos independente da paginação; ver comentário no próprio arquivo sobre esse trade-off).
- **Edição em massa** (`tabela-produtos.tsx` + `acoes-em-massa.ts`): seleção por checkbox (página atual ou "todos os resultados do filtro", com teto de 500), ativar/desativar, atribuir marca/categoria, ajustar estoque (definir valor OU somar/subtrair — o "somar" lê o estoque ATUAL no servidor, nunca um valor calculado no client, e pula silenciosamente qualquer produto que ficaria negativo, sem truncar em 0).
- **Importação CSV/XLSX** (`/admin/produtos/importar/`): upload → preview → confirmação explícita → aplica. Libs: `papaparse` (CSV) + `exceljs` (XLSX) — **não** o pacote `xlsx`/SheetJS, cuja versão no npm está travada há +1 ano numa versão com CVE conhecido sem patch. Limite de 300 linhas por importação (decisão deliberada: updates são feitos linha a linha pra não sobrescrever campos fora do arquivo tipo `imagem_url`/`ativo`, então é o gargalo real de tempo — 300 fica com margem segura mesmo em timeout de função serverless apertado). Produto novo importado **sempre** entra `ativo: false`, igual ao Bling. Categoria/marca que não existem ainda: configurável por linha (criar automaticamente ou pular) — ver `src/lib/produtos/importacao-tipos.ts` (`classificarLinha`, puro, roda tanto no preview client quanto na aplicação server, pra recalcular ao vivo sem round-trip). A confirmação final **revalida tudo de novo contra o banco**, nunca confia no que foi calculado no preview.
- **`duplicatas.ts`**: normalização (`trim` + minúsculas) de SKU/EAN, usada tanto na validação do formulário quanto nos filtros da listagem quanto na importação — uma lógica só, três lugares.

### Pedidos (`src/app/admin/pedidos/`, `src/lib/pedidos/`)

Tela nova (não existia antes desta rodada). Lista com filtro por status via query param, formulário simples pra avançar `em_separacao → enviado → entregue` (ver limitação deliberada na seção `pedidos` acima). `src/lib/pedidos/status.ts` centraliza rótulo pt-BR e cor do badge de cada status — usado tanto na página de confirmação do cliente quanto no admin, pra nunca ter dois textos diferentes pro mesmo status.

**Sem paginação de verdade ainda** (`LIMITE_PEDIDOS = 200`, só um limite alto) — se o volume de pedidos crescer, vale aplicar o mesmo padrão de paginação real já usado em `/admin/produtos`.

### Clientes / CRM B2B (`src/app/admin/clientes/`, migration 0013)

CRM enxuto — **não** um sistema de CRM completo: sem pipeline de vendas/funil/"negócios", sem timeline de interações. Só campos simples por cliente + o histórico de pedidos que já existia.

- **Tabela separada `clientes_crm`** (1:1 com `clientes` via `cliente_id`, `on delete cascade`), em vez de colunas direto em `clientes`. Motivo: `clientes` é escrita pelo checkout público via service_role e é lida por um fluxo que não tem nada a ver com CRM; RLS é por LINHA, não por coluna, então se um dia existir portal do cliente (`auth_user_id` + política "cliente vê a própria linha"), colunas de CRM dentro de `clientes` vazariam automaticamente pro cliente final. `clientes_crm` nunca tem nenhuma política para `anon` — leitura e escrita restritas a `authenticated`, mesmo padrão de `integracoes`/`eventos_integracao`.
- Campos: `nome_comprador` (contato principal, relevante pra PJ), `segmento` (lista pré-definida em `src/lib/clientes/segmentos.ts`, mas a coluna é `text` livre sem CHECK — mesmo padrão de `pedidos.status`/`forma_pagamento`, valida no app), `proxima_acao` (texto livre), `proxima_acao_data` (`date`, opcional), `valor_potencial` (`numeric`), `observacoes`.
- **"Última compra"/"último contato" não são colunas** — são calculados via `MAX(pedidos.created_at)` numa view `clientes_crm_resumo` (junta `clientes` + `clientes_crm` + o pedido mais recente por `lateral join`). "Último contato" hoje é literalmente a mesma data de "última compra", de propósito — não existe (nem foi criado agora) um sistema de registro de contatos separado.
- A view usa `security_invoker = true` (Postgres 15+, mesma técnica das funções `publicar_conteudo_site`/`publicar_banner` da migração 0012) — sem isso a RLS das tabelas de base seria ignorada e a view viraria uma porta lateral sem RLS.
- `/admin/clientes`: lista só PJ, com filtros por segmento, "sem próxima ação definida" (`proxima_acao_data is null`), "ação atrasada" (`proxima_acao_data < hoje`) e "sem compra há mais de N dias" (N configurável no próprio formulário de filtro, padrão 90) — filtros empurrados pra dentro da query (`.eq`/`.is`/`.lt`/`.or`), nunca em memória, mesmo padrão de `/admin/produtos`. `/admin/clientes/[id]`: dados cadastrais (read-only, vêm do checkout) + formulário de CRM (editável) + histórico de pedidos do cliente.
- `src/lib/clientes/proxima-acao.ts` classifica a urgência (`atrasada` / `hoje_ou_amanha` / `futura` / `sem_data`) — mesma função usada na listagem para colorir o badge da próxima ação.
- Dashboard: item "Clientes com ação atrasada" na Central de ações (`clientes_crm.proxima_acao_data < hoje`), linkando pra `/admin/clientes?atrasada=1`.

### Tickets de suporte (`src/app/admin/tickets/`, `src/lib/tickets/`, migration 0014)

Módulo básico — substitui o placeholder "Tickets pendentes" do dashboard por dado real. Escopo deliberadamente enxuto: **sem formulário público** ainda (cliente não abre ticket direto no site) — todo ticket é criado manualmente pelo admin em `/admin/tickets/novo`, tipicamente registrando uma reclamação recebida por telefone/WhatsApp.

- **`tickets`**: `cliente_id` e `pedido_id` são ambos opcionais (`on delete set null`) — um ticket pode vir de alguém ainda não cadastrado em `clientes`, ou não estar ligado a nenhum pedido específico. `status` (`aberto | em_andamento | resolvido | fechado`) e `prioridade` (`baixa | normal | alta`) são `text` livre sem CHECK constraint, validados no app — mesmo padrão de `pedidos.status`. `updated_at` é mantido por trigger (`tickets_atualizar_updated_at`), copiando o padrão já usado em `integracoes` (migração 0002), não setado manualmente pelo app feito em `clientes_crm`.
- **`ticket_respostas`**: histórico de conversa, **append-only** (sem política de UPDATE/DELETE — mensagem enviada não é editada nem apagada). `autor` (`cliente | admin`) existe mesmo sem formulário público: o admin pode registrar tanto uma resposta própria quanto algo que o cliente disse por telefone, pra manter o histórico da conversa completo desde já.
- `tickets.mensagem` é o relato inicial (preenchido na criação do ticket) — a conversa em si (`ticket_respostas`) começa vazia e cresce só com respostas subsequentes; a página de detalhe renderiza os dois juntos, na ordem certa.
- RLS: `authenticated` apenas, em ambas as tabelas — mesmo padrão de `clientes_crm`, nunca exposto a `anon` (não existe leitura/escrita pública ainda).
- `/admin/tickets`: filtros por status e prioridade empurrados pra query (`.eq`); a ordenação "prioridade primeiro, depois data" busca ordenado por `created_at desc` no banco e reordena só pelo peso da prioridade em memória — como `Array.sort` é estável, a ordem de data dentro de cada prioridade é preservada. Mesmo raciocínio de "sem paginação real ainda" de `/admin/pedidos` (`LIMITE_TICKETS = 300`).
- `/admin/tickets/[id]`: conversa completa + formulário de resposta (chama a Server Action direto do client, sem `<form action>`, porque depois de responder o componente limpa o campo e chama `router.refresh()` pra mostrar a nova mensagem sem recarregar a página manualmente — troca de status na mesma tela faz o mesmo). Esse `router.refresh()` depois de uma Server Action é uma escolha nova neste módulo (as telas de pedidos/clientes não precisavam, porque a mudança não precisa aparecer imediatamente na mesma tela).
- Dashboard: "Tickets pendentes" agora conta `tickets.status in ('aberto', 'em_andamento')` de verdade, linkando pra `/admin/tickets` (sem filtro — a contagem soma dois status, e a listagem hoje só filtra um de cada vez).

### Integrações (`src/lib/integracoes/`)

- **Bling**: OAuth (`bling.ts`), cliente de API de recursos com renovação automática de token e retry em 429 (`bling-api.ts`), envio de pedido de venda (`bling-pedidos.ts`), sincronização de estoque (`src/app/admin/integracao/bling/actions.ts`).
  - A lógica de sincronização de estoque usa **delta desde a última sincronização** (`bling_estoque_ultimo_sincronizado`), não o valor absoluto do Bling — comparar direto contra o estoque local reverteria vendas feitas no site (já aconteceu uma vez em produção, documentado no comentário da função `sincronizarEstoqueBling`).
  - Produto novo do Bling: sempre criado `ativo: false`, categoria/marca padrão, peso/dimensões em valores de fábrica (1kg/10x10x10) — fica pendente de revisão manual.
- **Melhor Envio**: mesmo padrão OAuth (`melhorenvio.ts`), usado no cálculo de frete do checkout.
- **Asaas**: webhook em `src/app/api/webhooks/asaas/route.ts` (rota pública, fora de `/admin` de propósito — autenticada por token de header, não por sessão). Mapeamento de status em `src/lib/pagamento/pedidos.ts`. Idempotente contra reenvio do mesmo evento (o `.update().neq()` só afeta a linha se o status realmente for diferente).

### Dashboard admin (`src/app/admin/page.tsx`)

Reescrito em torno de uma **"Central de ações"**: 9 itens, cada um com contagem colorida (verde=0/tudo certo, âmbar=precisa de atenção) e link direto pra resolver — nunca só um número decorativo. Itens: Pedidos para separar, Pagamentos falhos, Produtos sem imagem, Estoque baixo, Integrações com erro, Tickets pendentes (`tickets.status in ('aberto','em_andamento')`, dado real desde a Fase 5 — antes era um placeholder fixo em 0), Clientes com ação atrasada, Pedidos não enviados ao Bling, Webhooks/retries pendentes.

Cards do topo (fora da Central de ações) ficaram só com métricas realmente não-acionáveis: pedidos aguardando pagamento (nada pro admin fazer além de esperar), produtos na loja, estoque total, total de pedidos, clientes.

## Conteúdo do site — CMS versionado (`conteudo_site` / `banners`, migration 0012)

Menu de categorias, seções da home e paleta de cores do tema **saíram do código** (`src/components/layout/nav.tsx`, `src/app/(site)/page.tsx`, `src/app/globals.css`) e viraram dado editável pelo admin em `/admin/conteudo/{banners,menu,home,tema}`, sem depender de deploy. **Migration 0012 ainda não foi rodada no banco de produção no momento em que este texto foi escrito** — até rodar, o site inteiro continua funcionando exatamente como antes, porque cada leitura pública cai num fallback hardcoded (`src/lib/conteudo/padroes.ts`) quando a tabela/linha publicada não existe. Testado em dev: com a tabela ausente, home/menu/tema renderizam pelo fallback e `/admin/conteudo/banners` mostra um erro tratado ("Could not find the table 'public.banners'") em vez de página quebrada.

### Arquitetura de versionamento — mista, por decisão explícita do usuário

- **`conteudo_site`** (tipos `'menu' | 'home' | 'tema'`): cada publicação grava o **documento inteiro** daquele tipo como uma nova linha com `versao` incremental — nunca sobrescreve. No máximo uma linha `publicado = true` por tipo, garantido por índice único parcial no banco (`uq_conteudo_site_publicado`), não só por convenção da aplicação.
- **`banners`**: versionado **por item**. `banner_id` é estável entre versões (o `id` da linha muda a cada versão) — editar/reordenar/publicar um banner cria uma nova versão só dele, sem tocar no histórico dos outros. Mesma garantia de "no máximo 1 publicada" via índice parcial em `banner_id`.
- Em ambos os casos, a publicação (desmarcar a versão publicada anterior + inserir a nova já publicada) roda dentro de uma função SQL só (`publicar_conteudo_site` / `publicar_banner`, `security invoker`), não dois comandos separados do client — evita o site ficar um instante sem nenhuma versão publicada se algo falhar no meio.
- "Restaurar uma versão antiga" **nunca apaga histórico**: cria uma versão nova com o conteúdo copiado da antiga. Histórico só cresce.

### Formato do jsonb `dados`

Ver `src/lib/conteudo/tipos.ts` para os tipos TS completos (`DadosMenu`, `DadosHome`, `DadosTema`, `DadosBanner`). Resumo:

- **menu**: `{ itens: ItemMenu[] }`, árvore recursiva (`filhos: ItemMenu[]`, sem limite de profundidade no dado). Cada item é `tipo: "categoria" | "link" | "todos"` — `"categoria"` guarda só `categoria_id` e o href (`/produtos?categoria=<slug>`) é **sempre resolvido em runtime** a partir do slug atual da categoria (`src/lib/conteudo/resolver-href-menu.ts` + `obterMapaSlugsCategorias` em `consultas.ts`), nunca digitado à mão — isso resolve o TODO que existia em `nav.tsx` antes desta mudança. **Limitação conhecida**: o dado suporta N níveis de submenu, mas `Nav` (`src/components/layout/nav.tsx`) só desenha 1 nível de dropdown visualmente hoje — netos existem no dado mas aparecem como lista achatada dentro do dropdown do pai.
- **home**: `{ secoes: SecaoHome[] }`, união discriminada por `tipo`: `"hero"`, `"categorias_destaque"` (lista de `categoria_ids`), `"produtos_destaque"` (`modo: "manual"` com `produto_ids`, ou `"automatico"` com `categoria_id` opcional + `limite`).
- **tema**: `{ cores: { brand_green, brand_green_dark, dark, dark_2, page, ink, muted, warning } }` — mesmas 8 chaves de `globals.css`. Aplicado no site via um `<style>` inline no início do `<body>` em `src/app/layout.tsx` (root layout, roda em toda página do site — inclusive admin), sobrescrevendo as CSS custom properties de `globals.css`; **não existe `<head>` manual no root layout do App Router**, por isso o `<style>` fica no `<body>`, o que funciona normalmente em HTML.
- **banner**: `DadosBanner` = `{ imagem_url, link_url, titulo, ordem, ativo, data_inicio, data_fim }`. Renderizado na home (`src/app/(site)/page.tsx`) só quando `ativo = true` **e** dentro da janela `data_inicio`/`data_fim` (filtro em `bannersVisiveisAgora`, deliberadamente FORA do cache — precisa reavaliar a cada request, o cache não vira sozinho quando o relógio troca de dia).

### Cache e revalidação

Leituras públicas (`src/lib/conteudo/consultas.ts`) usam `unstable_cache` (tags `conteudo-menu`/`conteudo-home`/`conteudo-tema`/`conteudo-banners`/`categorias`, `revalidate: 300s` como rede de segurança) com um cliente Supabase **sem cookies** (`src/lib/supabase/publico.ts`) — `unstable_cache` proíbe chamar APIs dinâmicas como `cookies()` no corpo da função cacheada, então não dá pra reusar `criarClienteSupabaseServidor` aqui. Páginas do `/admin` continuam lendo direto (sem cache), como todo o resto do admin, pra sempre editar contra o dado mais atual.

Publicar/restaurar invalida com **`updateTag`** (não `revalidateTag`) — `import { updateTag } from "next/cache"`. Esse projeto está no **Next.js 16**, que trocou o modelo de cache (`cacheLife`/`cacheTag`/`"use cache"`, ver `node_modules/next/dist/docs/`); `revalidateTag` agora exige um segundo argumento (`profile`, ex. `"max"`) e serve conteúdo "stale" enquanto revalida em background — errado para o caso de uso daqui, onde o admin publica e espera ver o efeito imediatamente. `updateTag(tag)` (1 argumento, só chamável de dentro de Server Action) dá exatamente essa semântica "read-your-own-writes". `unstable_cache` em si já está marcado como substituído por `"use cache"` nessa versão, mas segue funcionando — não migramos pra `"use cache"`/Cache Components porque isso exigiria `cacheComponents: true` no `next.config.ts`, uma mudança de escopo bem maior que afetaria o app inteiro, não só esta feature.

### Admin

`/admin/conteudo/{banners,menu,home,tema}` — todos seguem `page.tsx` (Server Component, lê direto do banco) + `actions.ts` (`"use server"`, valida → chama a RPC de publicar → `updateTag` + `revalidatePath`) + editor client component. Menu e home usam publicação via **chamada direta da Server Action a partir do client** (não `<form action>` + `useActionState`, que não serve bem pra payload em árvore/array) — mesmo padrão já validado no projeto em `atualizarStatusEnvioPedido` (`src/app/admin/pedidos/actions.ts`), só que aqui a Server Action (`restaurarMenu`/`restaurarHome`/`restaurarTema`/`restaurarBanner`) também é passada como prop `onRestaurar` de Server Component pra Client Component (`src/components/admin/historico-conteudo.tsx`) — padrão suportado nativamente pelo Next.js. Banners usam o padrão `FormData` + `useActionState` de sempre (`formulario-banner.tsx`), igual a marcas/categorias, porque os campos são simples.

### Migração de dados (dentro da própria migration 0012)

Menu e tema foram migrados **exatamente como estavam** (idempotente via `where not exists`): todos os itens de menu como `tipo: "link"` apontando pra `/produtos` (nenhum virou `tipo: "categoria"` automaticamente — vincular categoria certa é decisão do admin, não algo pra migration adivinhar) e as 8 cores de `globals.css` 1:1. A home trocou a seção "Produtos em destaque", que antes era um **array mockado** (`// Dados mockados apenas para visualização do layout`, com comentário dizendo isso mesmo no código antigo), por `modo: "automatico"` sem categoria (produtos ativos mais recentes) — não fazia sentido preservar dado de exemplo como se fosse conteúdo real. Banners não têm seed: é feature nova, tabela começa vazia, e "nenhum banner publicado" é um estado normal (a seção simplesmente não renderiza na home).

### Efeito colateral: filtro de categoria em `/produtos`

Pra um item de menu `tipo: "categoria"` fazer sentido, `/produtos` (`src/app/(site)/produtos/page.tsx`) passou a aceitar `?categoria=<slug>` (match exato por `categoria_id`, sem incluir subcategorias) — antes desta mudança a página ignorava completamente qualquer query param, inclusive o `?busca=` que o formulário de busca do header já envia (esse continua sem uso — fora do escopo desta mudança).

## Integração do novo frontend visual (referencia-novo-frontend/) — EM ANDAMENTO, pausada

Objetivo: reestilizar as páginas públicas (home, listagem, produto) e transformar o carrinho
em painel lateral (drawer), usando `referencia-novo-frontend/` (projeto Vite/React separado,
só mock visual — `node_modules`/`tsconfig` próprios, excluído do build principal via
`tsconfig.json`) como referência. **Checkout, admin, autenticação e integrações
(Bling/Melhor Envio/Asaas) ficam fora de escopo**, exceto um campo aditivo no formulário de
produto (ver abaixo).

Decisões já fechadas com o usuário (não reabrir sem confirmar de novo):
- Paleta nova adotada do zero (tokens `fhezo-*`/`ink-*`/`warm-*` em `globals.css`, fonte Barlow
  como `--font-display`) — `/admin/conteudo/tema` deixa de afetar as páginas migradas (aceito
  pelo usuário).
- Header pode ficar com o visual novo mesmo aparecendo em cima do checkout (mesmo layout
  compartilhado hoje) — conteúdo/fluxo do checkout continua intocado.
- Preço "de/por", desconto Pix (5% fixo) e parcelamento (até 6x, mínimo R$50/parcela) foram
  implementados como dado REAL (campo novo no banco + regra utilitária), não fake.
- Avaliações/estrelas do mock ficaram de fora da integração (exigiria moderação, que tocaria
  admin — fora de escopo).
- A página `/carrinho` (rota cheia) será **removida** quando o drawer entrar (Etapa 3).

Plano completo em 4 etapas (aprovado pelo usuário) está salvo em
`C:\Users\ZMK Maquinas\.claude\plans\twinkly-cooking-boot.md` — arquivo local desta máquina,
**não versionado no repo**. Se não existir mais, reconstrua a partir desta seção + do
histórico da conversa onde foi aprovado.

### Feito até agora

- **Etapa 0 (preparação, sem efeito visual)**: `tsconfig.json` exclui `referencia-novo-frontend`
  (antes excluía `fhezo-store`, nome da pasta antes de ser renomeada);
  `@phosphor-icons/react` instalado; fonte Barlow adicionada em `src/app/layout.tsx` como
  `--font-barlow` (exposta como token Tailwind `--font-display` em `globals.css`); tokens
  novos (`fhezo-*`, `ink-*`, `warm-*`, `--radius-fhezo`, sombras `subtle/panel/drawer`)
  adicionados a `src/app/globals.css` **sem remover nenhum token `--color-*` antigo** —
  checkout continua usando os antigos.
- **Etapa 1 (visual de home/listagem/produto)**: feita e testada no navegador.
  - Reescritos: `src/app/(site)/page.tsx`, `secoes-home.tsx`, `produtos/page.tsx`,
    `produtos/[id]/page.tsx`, `produtos/[id]/botao-adicionar-carrinho.tsx` — todos continuam
    buscando dado real do Supabase/CMS exatamente como antes, só o JSX/classes mudaram.
  - Novo: `src/components/produtos/cartao-produto.tsx` (card de produto usado em
    home/listagem/similares).
  - Novo campo real `produtos.preco_de` (opcional, "preço riscado" pra desconto de/por):
    migration `supabase/migrations/0015_produtos_preco_de.sql`, tipo em
    `src/types/database.ts`, validação/persistência em `src/app/admin/produtos/actions.ts`,
    campo no formulário `src/app/admin/produtos/formulario-produto.tsx` (única mudança em
    `/admin` desta integração — aditiva).
  - Novo: `src/lib/produtos/precificacao.ts` (desconto de/por, Pix 5%, parcelamento até
    6x/mín. R$50/parcela — só exibição, não muda cobrança real do checkout).
  - `tsc`/`eslint`/`build` passando limpos. Testado visualmente: home, listagem, produto (com
    e sem imagem, com e sem estoque), adicionar ao carrinho, `/carrinho` e `/checkout`
    recebendo os itens reais corretamente (checkout continua pixel-a-pixel igual).

### Pendente — rodar antes de editar produtos no admin

**Migration 0015 ainda não foi aplicada no banco de produção.** Até rodar, salvar/editar
qualquer produto no admin falha (erro de coluna `preco_de` inexistente no schema cache do
PostgREST) — a leitura pública funciona normalmente sem ela (`select *` simplesmente não traz
a coluna, tratado como `undefined`/sem desconto). SQL a rodar no SQL Editor do Supabase:

```sql
alter table produtos add column if not exists preco_de numeric null;

comment on column produtos.preco_de is 'Preço "de" (riscado), opcional, só para exibição de desconto na loja. Null = sem desconto exibido. O preço real cobrado continua sendo "preco".';
```

### Por onde continuar

Retomar direto na **Etapa 2 (header)**: reestilizar `src/components/layout/header.tsx` no
visual do mock (`referencia-novo-frontend/src/components/layout/Header.tsx`), mantendo logo
real, busca via `<form action="/produtos" method="get">` (sem lógica nova), menu dinâmico
(`src/components/layout/nav.tsx` — continua lendo `conteudo_site` tipo "menu", **não** virar
mega-menu hardcoded como no mock) e o contador do carrinho (`indicador-carrinho.tsx`) ainda
linkando para `/carrinho` normalmente (abrir como drawer só entra na Etapa 3, de propósito,
pra isolar risco).

Depois, **Etapa 3 (carrinho em drawer — a mais arriscada, por último)**: estender
`src/lib/carrinho/contexto.tsx` com `aberto`/`abrirCarrinho`/`fecharCarrinho` (mesmo Context —
o carrinho continua sendo a mesma fonte de dados usada pelo checkout, sem duplicar estado),
criar `src/components/layout/carrinho-drawer.tsx` (visual baseado em
`referencia-novo-frontend/src/components/cart/CartDrawer.tsx`), trocar o link do contador do
header por um botão que chama `abrirCarrinho()`, e remover `src/app/(site)/carrinho/page.tsx`.

Testar cada etapa no navegador antes de avançar pra próxima, como nas etapas anteriores — o
usuário pediu explicitamente pra parar ao final de cada etapa e mostrar o resultado antes de
continuar.

## Autenticação de cliente (login no site público)

Estado em 2026-09-10: **código completo e testado ponta a ponta**; falta só
uma configuração no painel do Supabase (SMTP) para os e-mails saírem — ver
"O que falta configurar" no fim desta seção.

### Duas sessões, um único Supabase Auth

Admin e cliente usam o MESMO projeto Supabase Auth. Quem é admin é definido
pela tabela `admins` (migração 0018) e consultado pela função
`is_admin()` (`security definer`, ignora a RLS de `admins`, que
propositalmente não tem política nenhuma). Adicionar admin = inserir o
`auth.users.id` em `admins` pelo SQL Editor.

**`is_admin()` é a única definição de "quem é admin" no projeto** — usada
tanto pelas políticas de RLS quanto pelo `src/proxy.ts`. Não crie uma
segunda régua (lista de e-mails no código, variável de ambiente etc.): duas
definições saem de sincronia.

### `src/proxy.ts` — a trava do /admin

Até 2026-09-10 o middleware só checava `if (!user)`. Como um cliente que se
cadastra no site também é `authenticated`, **qualquer cliente entrava no
painel administrativo inteiro** — era exatamente o risco que o comentário
de abertura da migração 0018 antecipou, mas a parte da aplicação nunca
tinha sido feita (o `TODO` sobre "mais de um administrador" continuava lá).
A RLS já impedia esse cliente de ler/gravar qualquer dado interno, mas ele
enxergava a estrutura do painel.

Agora o middleware chama `is_admin()` e **falha fechado**: erro na chamada
= acesso negado. Não-admin autenticado é mandado para `/`, exceto em
`/admin/login`, que segue acessível de propósito (é onde se troca de conta).

Testado de verdade: cliente logado recebe redirect em `/admin`,
`/admin/clientes` e `/admin/produtos`; admin continua entrando normalmente.

### Telas e rotas

| Rota | O que faz |
|---|---|
| `/login` | Entrar. Mostra aviso quando volta de `/auth/confirm` com link inválido (`?erro=link_invalido`). |
| `/cadastro` | Criar conta. Se o projeto exigir confirmação, mostra a tela "confirme seu e-mail" com botão de **reenviar**. |
| `/conta` | Dados cadastrais, endereço padrão e histórico de pedidos do próprio cliente. |
| `/esqueci-senha` | Pede o link de recuperação por e-mail. |
| `/redefinir-senha` | Define a nova senha (exige a sessão criada pelo link). |
| `/auth/confirm` | Route Handler que recebe TODO link de e-mail e troca o token por sessão. |

`/auth/confirm` aceita os dois formatos de link de propósito:
`?token_hash=...&type=...` (template customizado, via `verifyOtp`) e
`?code=...` (template padrão do Supabase, via `exchangeCodeForSession`).
Assim o fluxo não quebra se alguém editar ou restaurar um template no
painel depois. O parâmetro `next` é validado para aceitar só caminho
interno — nunca vira redirecionamento aberto.

`/esqueci-senha` e o reenvio de confirmação **não distinguem** "e-mail não
cadastrado" de "e-mail já existe": respondem a mesma coisa nos dois casos,
de propósito, para não entregar a lista de clientes a quem fique testando
endereços.

### Como um pedido se liga à conta

Atualizado em 2026-09-11, no bloco de identidade (APPSEC-003/004/010/018).
**Não existe vínculo automático de nenhum tipo:**

- O checkout exige conta. O dono do pedido é SEMPRE o cliente da sessão
  (`auth.uid()` → `clientes.auth_user_id`, em `criarPedido`). O `clienteId`
  que o navegador manda só serve para recusar o pagamento quando a conta
  mudou no meio do caminho. Ele nunca decide o dono.
- O cadastro recusa CPF/CNPJ que já exista em `clientes`, com ou sem conta.
  Nunca assume a linha, porque saber um documento não prova ser o dono dele.
- Login e confirmação de e-mail não vinculam nada por e-mail. A antiga
  `vincularClienteExistentePorEmail` foi removida: o e-mail de uma compra
  sem conta nunca foi verificado.
- `buscarResumoPedido`, usada na confirmação, Pix, boleto e status, só
  devolve pedido do cliente da sessão.

Quem comprou sem conta, antes de o login existir, e quer o histórico
precisa passar pelo atendimento. O site ainda não tem um processo de
recuperação com verificação. **Não reintroduza vínculo por documento ou
e-mail sem essa verificação.**

O cliente só consegue alterar na própria linha de `clientes` as colunas
`nome`, `telefone` e `endereco_*`: é privilégio por coluna, definido na
migração 0033. Uma coluna nova nasce **não editável** pelo cliente e
precisa ser liberada explicitamente com `grant update (coluna)`.

### Como testar sem SMTP

`generateLink` da Admin API devolve o token **sem disparar e-mail** — é
como o fluxo de recuperação foi validado aqui. O `hashed_token` que ele
retorna é exatamente o `{{ .TokenHash }}` do template:

```js
const { data } = await admin.auth.admin.generateLink({ type: "recovery", email });
// abrir no navegador:
// /auth/confirm?token_hash=<data.properties.hashed_token>&type=recovery&next=%2Fredefinir-senha
```

Cuidado ao testar: o token é de uso único. E se o navegador estiver com
cookie de uma sessão antiga inválida, limpe antes — isso já causou um
falso negativo aqui.

### O que falta configurar no painel do Supabase

Nada disso é código; sem isso o cadastro trava em "confirme seu e-mail"
para sempre, porque o SMTP embutido do Supabase é limitado a poucos envios
por hora e só entrega para endereços da própria equipe.

1. **Authentication > Emails > SMTP Settings** — ligar SMTP próprio
   (Resend, SendGrid, Amazon SES). Sem isso, nenhum e-mail chega a cliente
   de verdade.
2. **Authentication > URL Configuration** — `Site URL` = domínio de
   produção; em `Redirect URLs` incluir `https://<domínio>/auth/confirm`,
   `http://localhost:3000/auth/confirm` e o padrão de preview da Vercel.
   URL fora dessa lista é ignorada e o usuário cai na Site URL sem sessão.
3. **Authentication > Emails > Templates** (recomendado, não obrigatório) —
   trocar `{{ .ConfirmationURL }}` pelo formato `token_hash`:

   - Confirm signup:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/conta`
   - Reset password:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`

   Vantagem: o template padrão usa o fluxo PKCE, em que o verificador fica
   num cookie do navegador que pediu o e-mail — abrir o link no celular
   depois de pedir no desktop **falha**. O formato `token_hash` não tem
   essa limitação. Os dois funcionam com `/auth/confirm`.

Enquanto o "Confirm email" estiver ligado (está, hoje) e não houver SMTP,
dá para liberar uma conta na mão em Authentication > Users > (usuário) >
Confirm email.

## Modo construção e kill switch do checkout (2026-09-12)

Duas travas independentes, configuradas só por variável de ambiente
(`src/lib/config/lancamento.ts`, mesmo estilo de APPSEC-028: aceita só
`"true"`/`"false"`, ausente ou inválido cai no lado seguro).

**`MAINTENANCE_MODE`** (ausente/inválido = ligado). Portão no início do
`src/proxy.ts` (`src/lib/manutencao/portao.ts`), que agora roda em todo
caminho, exceto `/_next/static/` e `/favicon.ico`. Visitante sem liberação
recebe 503 com a página "Site em construção". O HTML é autocontido
(`src/lib/manutencao/pagina.ts`), sem script, asset nem banco. A senha é
digitada nessa página e conferida em `POST /manutencao/entrar`, que grava o
cookie `fhezo_manutencao`: HttpOnly, Secure, SameSite=Lax, 7 dias, com
HMAC-SHA256 de `MAINTENANCE_SECRET` sobre a expiração e um hash da senha.
O cookie **não contém a senha** (`src/lib/manutencao/liberacao.ts`). Trocar
a senha ou o segredo revoga todas as liberações.

Rotas que passam sem cookie, com caminho **e** método exatos, nunca por
prefixo, query ou cabeçalho:

| Rota | Motivo |
|---|---|
| `POST /api/webhooks/asaas` | Servidor→servidor; continua exigindo `ASAAS_WEBHOOK_TOKEN`. |
| `GET /admin/integracao/melhorenvio/callback` | Retorno do OAuth; continua exigindo sessão de admin. |
| `GET /admin/integracao/bling/callback` | Idem, Bling. |
| `POST /manutencao/entrar` | Onde a senha é conferida. |

Qualquer requisição com cabeçalho `Next-Action` (Server Action) é bloqueada
sem cookie, inclusive nas rotas acima: o Next pode encaminhar uma action
para o worker certo mesmo se o POST chegar em outro caminho.

**A senha de manutenção não é login de admin.** Todo `/admin` exige o
cookie de manutenção **e depois** o `is_admin()` de sempre.

**`CHECKOUT_ENABLED`** (ausente/inválido = fechado). A autoridade é a
primeira linha de `criarPedido` (`src/app/(site)/checkout/pagamento/actions.ts`),
antes de validar entrada, ler sessão, reservar limite, descontar estoque,
falar com o Asaas ou gravar pedido. `criarCobrancaAsaas`
(`src/lib/pagamento/asaas.ts`) repete a checagem como segunda trava. O
aviso no topo do checkout (`checkout/layout.tsx`) é só UX. Webhook do
Asaas e demais integrações não são afetados.

Vercel → Production (mudar variável exige **novo deploy**):

| Variável | Em construção | No lançamento |
|---|---|---|
| `MAINTENANCE_MODE` | `true` | `false` |
| `CHECKOUT_ENABLED` | `false` | `true` |
| `MAINTENANCE_PASSWORD` | senha forte, ≥ 12 caracteres | pode ficar |
| `MAINTENANCE_SECRET` | aleatório, ≥ 32 caracteres, ≠ senha | pode ficar |

Em Production o **build falha** se `MAINTENANCE_MODE`/`CHECKOUT_ENABLED`
não estiverem declaradas, ou se a manutenção estiver ligada sem
senha/segredo válidos (`next.config.ts`). Em Preview e local não falha o
build, mas cai no lado seguro. Para desenvolver local sem a página:
`MAINTENANCE_MODE=false` no `.env.local`.

Limites conhecidos: `/manutencao/entrar` tem só atraso fixo de 400 ms por
senha errada, não limite persistente de tentativas. Por isso a senha deve
ser forte e própria, não reaproveitada de outra conta. Links de e-mail
(`/auth/confirm`) só funcionam em navegador já liberado.

## Convenções do projeto (siga estas, não as genéricas)

- **Tudo em português**: nomes de função/variável, comentários, mensagens de erro, labels de UI. Nomes de coluna do banco em `snake_case` batem exatamente com os campos TS em `src/types/database.ts` (sem camada de tradução).
- **Server Actions em vez de API routes** pra tudo dentro do admin. Um Client Component pode importar e chamar uma Server Action direto (sem passar por prop) — padrão usado bastante pra ações "rápidas" tipo criar marca inline.
- **Nunca confiar em dado vindo do client sem revalidar no servidor** — ids de seleção em massa são reconferidos contra o banco antes de aplicar; a importação CSV revalida tudo de novo no momento de aplicar, não confia no que foi calculado no preview.
- **RLS**: `anon` (site público) só enxerga `ativo/ativo=true`; `authenticated` (o único admin) enxerga tudo. Tabelas sem necessidade de leitura pública (ex.: `integracoes`, `eventos_integracao`) não têm política pra `anon`. Nenhuma tabela tem política de `delete` pra `authenticated` onde a UI só oferece "ativar/desativar" (marcas, categorias).
- **Paleta de cores fixa** (`src/app/globals.css`): `brand-green`/`brand-green-dark`, `dark`/`dark-2`, `page`, `ink`, `muted`, `warning`. Vermelho (`red-*` do Tailwind, não declarado como token da marca) é usado por convenção pra ações destrutivas/erro — mesmo não sendo um token oficial, é o padrão já estabelecido, não invente outra cor pra "erro"/"crítico".
- **Migrations são arquivos SQL simples** em `supabase/migrations/`, numerados sequencialmente, aplicados manualmente pelo usuário no SQL Editor — não existe `supabase link`/CLI configurado neste ambiente. Sempre proponha o SQL completo, nunca assuma que rodou sozinho.
- **Sem paginação real ainda** fora de `/admin/produtos` — se qualquer outra listagem crescer, replicar o padrão de lá (`.range()` + `count: 'exact'`, filtros empurrados pra dentro da query, nunca filtrados em memória depois de paginar).

## Lacunas conhecidas (não implementadas, mencionadas ao usuário quando surgiram)

Revisado em 2026-09-10 **contra o banco de produção real** — vários itens
desta lista descreviam migrations "ainda não aplicadas" que já estavam
aplicadas há tempo, e módulos "inexistentes" que já existiam. Se for
acrescentar um item aqui, confira antes com uma query; esta lista já
enganou uma vez.

Pendências reais hoje:

- **SMTP do Supabase não configurado** — é o que impede o login de cliente
  de funcionar de ponta a ponta (ver "O que falta configurar no painel do
  Supabase" na seção de Autenticação de cliente). O código está pronto e
  testado.
- Checkout integrado em 2026-09-11: exige conta e usa a identificação/endereço cadastrados; ver VALIDACAO-CHECKOUT.md para o estado e os limites da homologação.
- "Polias" e "Correias" existem como item de menu mas **não** como
  categoria; apontam para `/produtos` até alguém criar as categorias e
  religar em `/admin/conteudo/menu`.
- Paginação real só existe em `/admin/produtos`. `/admin/pedidos`
  (`LIMITE_PEDIDOS = 200`) e `/admin/tickets` (`LIMITE_TICKETS = 300`) são
  limites fixos.
- `eventos_integracao` não tem campo de "resolvido" — a contagem do
  dashboard usa uma janela de 7 dias como proxy.
- Módulo de tickets não tem formulário público — cliente não abre ticket
  direto no site, só o admin cria manualmente. Se isso for implementado,
  cuidado com RLS: `tickets`/`ticket_respostas` não têm NENHUMA política
  para `anon`, de propósito.
- `Nav`/mega-menu só desenham 1 nível de dropdown — o dado
  (`ItemMenu.filhos`, `categoria_pai_id`) suporta N níveis, mas netos
  aparecem achatados dentro do dropdown do pai. Hoje isso não aparece na
  loja porque **nenhuma categoria tem subcategoria cadastrada**.
- Busca do header (`?busca=` em `/produtos`) continua sem efeito — a
  listagem só filtra por `?categoria=` e `?marca=`.
- A página 404 é a padrão do Next.js (tela preta, sem header/footer e sem
  caminho de volta).

Já resolvido, não repetir como lacuna: módulo de tickets, upload de imagem
com bucket de storage, e as migrations 0012, 0013, 0014, 0015 e 0018 —
todas **aplicadas** em produção (conferido em 2026-09-10).

## Checkout — integração visual de 2026-09-11

Rotas: /checkout → /checkout/identificacao → /checkout/pagamento. Identificação exige conta e é preenchida pelo cadastro autenticado. CSS isolado, rascunho por aba e cartão na página hospedada do Asaas. Acompanhamento de pedidos exige a conta proprietária. Ver VALIDACAO-CHECKOUT.md para testes, migração de idempotência, configuração local de sandbox e limite da homologação transacional.


## Atualização — cartão transparente no checkout (11/09/2026)

O pagamento de cartão agora é preenchido em /checkout/pagamento e enviado pelo backend ao Asaas, sem redirecionar. Esta atualização substitui as descrições anteriores de cartão hospedado neste documento. O código não persiste PAN/CVV/titular/token e não registra payloads em logs. Os dados passam temporariamente pela memória do navegador e servidor, conforme o modelo de integração do Asaas.

Inclui CSP por nonce, validação servidor/cliente, HTTPS/IP, erros sanitizados, timeout sem repetição automática, idempotência e limite persistente de tentativas por conta/IP. Pix/boleto e regras reais de estoque, preço e frete permanecem integrados. A tabela checkout_tentativas existente também guarda reservas de limite sem dados do cartão; registros de limite podem ser limpos por expiraEm e tipo, nunca remover automaticamente tentativas de cobrança incerta.

186 testes passaram; build, TypeScript e lint do escopo verificados. Evidências, procedimentos e pendências estão em VALIDACAO-CHECKOUT.md. Os pagamentos dos testes de navegador são respostas controladas. Falta homologar cartão + webhook em sandbox isolado e revisar coleta de logs/APM/replay e exigências PCI no deploy real. Nenhuma compra real foi efetuada e nenhuma configuração de produção foi alterada.
