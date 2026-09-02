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
      layout.tsx               # Layout do site (header + footer)
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
- Esta etapa **não grava pedido no banco nem processa pagamento** — só
  valida e guarda os dados em memória para a próxima etapa.

## Status atual

Este é o **Bloco 3 (parte 1)** do projeto: carrinho de compras funcional e
checkout com dados do cliente + cálculo de frete. Ainda faltam: a etapa de
pagamento, a criação do registro em `pedidos`/`pedido_itens`, e a gestão de
clientes/pedidos no admin.
