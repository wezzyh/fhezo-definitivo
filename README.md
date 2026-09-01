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

3. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura de pastas

```
src/
  app/
    (site)/              # Páginas públicas (home, institucional, produtos)
      page.tsx           # Home
      produtos/
        page.tsx         # Listagem de produtos
        [id]/page.tsx    # Página de um produto
      layout.tsx         # Layout do site (header + footer)
    admin/                # Painel administrativo (rota protegida — uso interno)
      page.tsx
    layout.tsx            # Layout raiz da aplicação
  components/
    ui/                   # Componentes reutilizáveis (Button, Card, Input)
    layout/                # Header, Footer, Nav
  lib/
    supabase/
      client.ts           # Cliente Supabase para Client Components (browser)
      server.ts           # Cliente Supabase para Server Components/Route Handlers
  types/
    database.ts            # Tipos compartilhados: Produto, Cliente, Pedido
```

## Status atual

Este é o **Bloco 0** do projeto: estrutura base, sem conexão real com o
Supabase e sem autenticação implementada ainda. Os pontos onde essas
integrações entrarão estão marcados com comentários `TODO` no código
(principalmente em `src/app/admin/page.tsx` e `src/lib/supabase/`).
