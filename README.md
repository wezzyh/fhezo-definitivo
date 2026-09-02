# FHEZO Industrial — E-commerce

E-commerce para venda de componentes industriais: rolamentos, engrenagens,
correntes, graxas, ferramentas, parafusos e porcas especiais.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- ESLint
- [Supabase](https://supabase.com) (Postgres + Autenticação)

## Como rodar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente. Copie o arquivo de exemplo e preencha
   com as credenciais do seu projeto Supabase (Project Settings > API):

   ```bash
   cp .env.local.example .env.local
   ```

   Variáveis necessárias em `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API — nunca expor ao navegador)
   - `MELHOR_ENVIO_CLIENT_ID` / `MELHOR_ENVIO_CLIENT_SECRET` (app cadastrado no painel sandbox do Melhor Envio)
   - `MELHOR_ENVIO_REDIRECT_URI` (deve ser idêntica à URL de callback cadastrada nesse painel)
   - `MELHOR_ENVIO_CEP_ORIGEM` (CEP de onde os produtos são enviados)
   - `ASAAS_API_KEY` (API Key do ambiente sandbox do Asaas)
   - `ASAAS_WEBHOOK_TOKEN` (valor definido por você e cadastrado igual no painel do Asaas)

3. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura de pastas

```
src/
  app/
    (site)/                    # Páginas públicas (home, institucional, produtos)
      page.tsx                 # Home
      produtos/
        page.tsx               # Listagem de produtos ativos (dados reais do Supabase)
        [id]/page.tsx          # Página de um produto
      checkout/
        page.tsx                # Dados do cliente + endereço + frete
        actions.ts               # Server Action: grava/atualiza cliente em "clientes"
        pagamento/
          page.tsx                # Escolha da forma de pagamento (Pix/boleto/cartão)
          actions.ts               # Server Actions: cria cobrança no Asaas + grava o pedido
          formulario-cartao.tsx    # Formulário de cartão + dados do titular
        confirmacao/
          page.tsx                # Número do pedido, status, boleto (se aplicável)
          actions.ts               # Busca o resumo do pedido para exibir
      layout.tsx               # Layout do site (header + footer)
    api/
      webhooks/
        asaas/route.ts           # Recebe confirmação de pagamento do Asaas
    admin/                      # Painel administrativo (rota protegida — uso interno)
      login/page.tsx            # Login (Supabase Auth, email/senha)
      login/actions.ts          # Server Action de login
      produtos/
        page.tsx                # Lista todos os produtos (inclusive inativos)
        novo/page.tsx            # Formulário de criação
        [id]/editar/page.tsx     # Formulário de edição + exclusão
        actions.ts               # Server Actions de criar/atualizar/excluir produto
        formulario-produto.tsx   # Formulário reutilizado por "novo" e "editar"
      layout.tsx                 # Cabeçalho do painel (nav + botão Sair)
      actions.ts                 # Server Action de logout
      page.tsx                   # Dashboard
    layout.tsx                   # Layout raiz da aplicação
  components/
    ui/                          # Componentes reutilizáveis (Button, Card, Input)
    layout/                      # Header, Footer, Nav
  lib/
    supabase/
      client.ts                 # Cliente Supabase para Client Components (browser)
      server.ts                 # Cliente Supabase para Server Components/Server Actions
      admin.ts                  # Cliente com service_role key (ignora RLS) — só server-side confiável
    integracoes/
      melhorenvio.ts             # Fluxo OAuth 2.0 do Melhor Envio (autorização, refresh, persistência)
    pagamento/
      asaas.ts                   # Cliente da API do Asaas (customer, cobrança, Pix, boleto)
      pedidos.ts                  # Mapeia status do Asaas -> status do pedido (webhook + polling)
      validar-cartao.ts           # Validação de cartão no navegador (Luhn, validade, CVV)
    produtos/
      formatar-atributos.ts     # Formata o jsonb de atributos técnicos para exibição
  types/
    database.ts                 # Tipos compartilhados: Produto, Cliente, Pedido, PedidoItem
  proxy.ts                       # Protege as rotas /admin (redireciona para /admin/login)
```

## Autenticação do admin

O painel (`/admin`) usa Supabase Auth (email/senha). Não há tela de cadastro:
crie o usuário administrador manualmente no painel do Supabase (Authentication
> Users > Add user). O arquivo `src/proxy.ts` (equivalente ao antigo
`middleware.ts` a partir do Next.js 16) protege todas as rotas `/admin/*`,
redirecionando para `/admin/login` quando não há sessão. Hoje existe um único
administrador — pontos para uma futura checagem de "role" estão marcados com
`TODO` no código.

## Carrinho e checkout (Bloco 3)

- O carrinho vive em Context + `useReducer` (`src/lib/carrinho/`), persistido em
  `localStorage`. É lido/gravado apenas no navegador — no servidor e no
  primeiro render sempre começa vazio, para não gerar erro de hidratação.
- O checkout (`src/lib/checkout/` e `src/app/(site)/checkout/`) guarda os
  dados do cliente e do frete escolhido em Context (não em `localStorage`,
  já que só precisa sobreviver à navegação dentro do fluxo de compra).
- CPF/CNPJ são validados pelo dígito verificador (`src/lib/checkout/validar-documento.ts`),
  não só pelo formato.
- CEP autopreenche endereço via ViaCEP; CNPJ autopreenche razão social e
  endereço via BrasilAPI — ambas chamadas direto do navegador, com fallback
  para preenchimento manual se a consulta falhar.
- O frete é calculado via Server Action (`src/lib/frete/melhorenvio.ts`),
  chamando a API sandbox do Melhor Envio com o CEP de destino e o
  peso/dimensões dos produtos no carrinho. O access_token usado vem da
  tabela `integracoes` (fluxo OAuth 2.0, ver `src/lib/integracoes/melhorenvio.ts`
  e a seção "Integrações" em `/admin`), com renovação automática via
  refresh_token.
- Ao avançar para o pagamento, o cliente é gravado (ou atualizado, se o
  CPF/CNPJ já existir) na tabela `clientes` via Server Action
  (`src/app/(site)/checkout/actions.ts`).

## Pagamento (Asaas) e criação do pedido

- `/checkout/pagamento` (`src/app/(site)/checkout/pagamento/`) oferece Pix,
  boleto e cartão. Ao confirmar, a Server Action `criarPedido` (`actions.ts`
  dessa pasta): valida preço/estoque direto no banco (nunca confia no preço
  vindo do navegador), cria/reaproveita o customer no Asaas, cria a
  cobrança e só então grava o pedido em `pedidos` + `pedido_itens`.
- Pix: mostra QR Code + código copia-e-cola e faz polling do status a cada
  5s (`verificarStatusPagamento`) até a confirmação, redirecionando para
  `/checkout/confirmacao`.
- Boleto/cartão: como a cobrança já nasce criada (ou paga, no caso do
  cartão aprovado), o redirecionamento para `/checkout/confirmacao` é
  imediato.
- O carrinho é limpo assim que o pedido é gravado com sucesso — mesmo que o
  Pix ainda esteja aguardando confirmação.
- `src/app/api/webhooks/asaas/route.ts` recebe os eventos de cobrança do
  Asaas (fonte de verdade do status de pagamento) e atualiza `pedidos` pelo
  `asaas_payment_id`. Valida o cabeçalho `asaas-access-token` contra
  `ASAAS_WEBHOOK_TOKEN` antes de processar qualquer coisa.
- Todo acesso às tabelas `clientes`/`pedidos`/`pedido_itens` nesse fluxo usa
  a service_role key (`src/lib/supabase/admin.ts`), porque quem compra é um
  visitante sem sessão de admin.

## Status atual

Este é o **Bloco 3** completo: carrinho, checkout (dados do cliente +
endereço + frete) e pagamento (Pix/boleto/cartão via Asaas) com gravação
definitiva do pedido. Ainda falta: a gestão de clientes/pedidos no painel
admin (listar, ver detalhes, mudar status manualmente).
