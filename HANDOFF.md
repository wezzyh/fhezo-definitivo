# Handoff — Loja Fhezo

Documento de contexto pra qualquer IA (ou humano) que for mexer neste projeto depois. Foco em **o que já existe e por quê**, não em como usar Next.js/Supabase em geral. Escrito em pt-BR de propósito — todo o código, comentários e UI do projeto também são.

Verificado contra o banco de produção real em 2026-09-03 (não é só o que os arquivos de migration *deveriam* fazer — várias vezes nesta conversa a suposição "ainda não rodou" estava errada; sempre vale reconferir com uma query antes de assumir).

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

## Convenções do projeto (siga estas, não as genéricas)

- **Tudo em português**: nomes de função/variável, comentários, mensagens de erro, labels de UI. Nomes de coluna do banco em `snake_case` batem exatamente com os campos TS em `src/types/database.ts` (sem camada de tradução).
- **Server Actions em vez de API routes** pra tudo dentro do admin. Um Client Component pode importar e chamar uma Server Action direto (sem passar por prop) — padrão usado bastante pra ações "rápidas" tipo criar marca inline.
- **Nunca confiar em dado vindo do client sem revalidar no servidor** — ids de seleção em massa são reconferidos contra o banco antes de aplicar; a importação CSV revalida tudo de novo no momento de aplicar, não confia no que foi calculado no preview.
- **RLS**: `anon` (site público) só enxerga `ativo/ativo=true`; `authenticated` (o único admin) enxerga tudo. Tabelas sem necessidade de leitura pública (ex.: `integracoes`, `eventos_integracao`) não têm política pra `anon`. Nenhuma tabela tem política de `delete` pra `authenticated` onde a UI só oferece "ativar/desativar" (marcas, categorias).
- **Paleta de cores fixa** (`src/app/globals.css`): `brand-green`/`brand-green-dark`, `dark`/`dark-2`, `page`, `ink`, `muted`, `warning`. Vermelho (`red-*` do Tailwind, não declarado como token da marca) é usado por convenção pra ações destrutivas/erro — mesmo não sendo um token oficial, é o padrão já estabelecido, não invente outra cor pra "erro"/"crítico".
- **Migrations são arquivos SQL simples** em `supabase/migrations/`, numerados sequencialmente, aplicados manualmente pelo usuário no SQL Editor — não existe `supabase link`/CLI configurado neste ambiente. Sempre proponha o SQL completo, nunca assuma que rodou sozinho.
- **Sem paginação real ainda** fora de `/admin/produtos` — se qualquer outra listagem crescer, replicar o padrão de lá (`.range()` + `count: 'exact'`, filtros empurrados pra dentro da query, nunca filtrados em memória depois de paginar).

## Lacunas conhecidas (não implementadas, mencionadas ao usuário quando surgiram)

- Módulo de tickets/suporte — não existe, só um placeholder no dashboard.
- Upload de imagem de verdade (hoje é só campo de URL — não tem bucket de storage configurado).
- Paginação real em `/admin/pedidos` (hoje é um limite fixo de 200).
- `eventos_integracao` não tem campo de "resolvido" — contagem do dashboard é uma janela de 7 dias como proxy.
- Migration 0012 (`conteudo_site`/`banners`, CMS de menu/home/tema/banners) ainda não foi aplicada no banco de produção — ver seção "Conteúdo do site" acima pro SQL e o que fazer antes/depois de rodar.
- Migration 0013 (`clientes_crm`, CRM B2B) também ainda não foi aplicada no banco de produção. Diferente do CMS, aqui não existe fallback: até rodar, `/admin/clientes` mostra um erro tratado ("relation clientes_crm_resumo does not exist") em vez de lista vazia, e o item "Clientes com ação atrasada" do dashboard aparece como 0 (a consulta falha silenciosamente, `count` vem `null`, tratado como 0 — não trava o dashboard, mas também não avisa que a tabela não existe ainda).
- Migration 0014 (`tickets`/`ticket_respostas`, módulo de suporte) também ainda não foi aplicada no banco de produção — mesmo comportamento de degradação do item acima (`/admin/tickets` mostra erro tratado, "Tickets pendentes" no dashboard aparece como 0 em vez de avisar que a tabela não existe).
- Módulo de tickets não tem formulário público — cliente não abre ticket direto no site, só o admin cria manualmente. Se isso for implementado depois, cuidado com RLS: hoje `tickets`/`ticket_respostas` não têm NENHUMA política para `anon`, de propósito.
- `Nav` só desenha 1 nível de dropdown de submenu — o dado (`ItemMenu.filhos`) suporta árvore de N níveis, mas netos aparecem achatados dentro do dropdown do pai, não em submenu aninhado visualmente.
- Busca do header (`?busca=` em `/produtos`) continua sem efeito — só o filtro por `?categoria=` (novo, ver seção "Conteúdo do site") foi implementado.
