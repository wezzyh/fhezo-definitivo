// Teste estrutural das políticas de RLS declaradas nas migrations
// (APPSEC-024). Repassa todas as migrations em ordem — create policy / drop
// policy — e falha se, no estado final, sobrar qualquer política de ESCRITA
// (INSERT, UPDATE, DELETE ou ALL) para "authenticated" ou "public" com
// "using (true)" ou "with check (true)".
//
// Existe porque a 0018 corrigiu as tabelas que existiam naquele momento, e
// duas tabelas criadas depois (0021, 0026) repetiram a regra antiga sem
// ninguém perceber. Com este teste, uma migration futura que repita o erro
// quebra o `npm test`.
//
// Limite: vê só o que está nas migrations. Políticas criadas direto no
// painel do Supabase não aparecem aqui — para isso, a consulta V-2 no
// banco real (supabase/testes/rls_appsec_024.sql, seção 4, e o relatório).

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PASTA_MIGRATIONS = fileURLToPath(new URL("../migrations/", import.meta.url));

interface Politica {
  tabela: string;
  nome: string;
  comando: "all" | "select" | "insert" | "update" | "delete";
  papeis: string[];
  usingTrue: boolean;
  checkTrue: boolean;
  definicao: string;
  migration: string;
}

/** Comandos SQL de um arquivo, sem comentários e sem corpos $$...$$ (que podem conter ";"). */
function comandosSql(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "$$corpo$$")
    .split(";")
    .map((comando) => comando.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizarTabela(tabela: string): string {
  return tabela.replace(/"/g, "").toLowerCase().replace(/^public\./, "");
}

/** Estado final das políticas depois de aplicar as migrations em ordem. */
function aplicarMigrations(migrations: { nome: string; sql: string }[]): Map<string, Politica> {
  const politicas = new Map<string, Politica>();

  for (const { nome, sql } of migrations) {
    for (const comando of comandosSql(sql)) {
      const drop = /^drop policy (?:if exists )?"([^"]+)" on ([\w."]+)/i.exec(comando);
      if (drop) {
        politicas.delete(`${normalizarTabela(drop[2])}|${drop[1]}`);
        continue;
      }

      const criacao = /^create policy "([^"]+)" on ([\w."]+)(.*)$/i.exec(comando);
      if (criacao) {
        const [, nomePolitica, tabelaBruta, resto] = criacao;
        const tabela = normalizarTabela(tabelaBruta);
        const comandoPolitica = (/\bfor (all|select|insert|update|delete)\b/i.exec(resto)?.[1] ?? "all").toLowerCase() as Politica["comando"];
        const papeisTexto = /\bto ([\w, ]+?)(?= using\b| with\b|$)/i.exec(resto)?.[1];
        politicas.set(`${tabela}|${nomePolitica}`, {
          tabela,
          nome: nomePolitica,
          comando: comandoPolitica,
          papeis: papeisTexto ? papeisTexto.split(",").map((papel) => papel.trim().toLowerCase()) : ["public"],
          usingTrue: /\busing \( ?true ?\)/i.test(resto),
          checkTrue: /\bwith check \( ?true ?\)/i.test(resto),
          definicao: comando,
          migration: nome,
        });
        continue;
      }

      if (/^create policy\b/i.test(comando)) {
        // Nunca pular em silêncio uma política que o parser não entendeu.
        throw new Error(`"create policy" não reconhecido em ${nome}: ${comando}`);
      }
    }
  }

  return politicas;
}

function politicasDeEscritaAbertas(politicas: Map<string, Politica>): string[] {
  return [...politicas.values()]
    .filter(
      (politica) =>
        (politica.papeis.includes("authenticated") || politica.papeis.includes("public")) &&
        politica.comando !== "select" &&
        (politica.usingTrue || politica.checkTrue),
    )
    .map((politica) => `${politica.tabela}: "${politica.nome}" (${politica.migration})`)
    .sort();
}

function lerMigrations(): { nome: string; sql: string }[] {
  return readdirSync(PASTA_MIGRATIONS)
    .filter((arquivo) => arquivo.endsWith(".sql"))
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(`${PASTA_MIGRATIONS}${nome}`, "utf8") }));
}

describe("políticas de RLS nas migrations (APPSEC-024)", () => {
  it("nenhuma política de escrita aberta para authenticated/public sobrevive às migrations", () => {
    expect(politicasDeEscritaAbertas(aplicarMigrations(lerMigrations()))).toEqual([]);
  });

  it("sem a 0032, o teste encontra exatamente as políticas do APPSEC-024 (prova que o teste pega o bug)", () => {
    const semCorrecao = lerMigrations().filter((migration) => !migration.nome.startsWith("0032_"));
    expect(politicasDeEscritaAbertas(aplicarMigrations(semCorrecao))).toEqual([
      'paginas_institucionais: "Admin autenticado atualiza pagina institucional" (0021_paginas_institucionais.sql)',
      'paginas_institucionais: "Admin autenticado cria pagina institucional" (0021_paginas_institucionais.sql)',
      'produto_imagens: "Admin autenticado gerencia imagens de produto" (0026_produto_imagens.sql)',
    ]);
  });

  it("toda escrita em paginas_institucionais e produto_imagens exige is_admin()", () => {
    const politicas = [...aplicarMigrations(lerMigrations()).values()].filter((politica) =>
      ["paginas_institucionais", "produto_imagens"].includes(politica.tabela),
    );
    const escrita = politicas.filter((politica) => politica.comando !== "select");

    expect(escrita.length).toBeGreaterThan(0);
    for (const politica of escrita) {
      expect(politica.definicao, politica.nome).toMatch(/is_admin\(\)/);
    }
    // Página: sem DELETE (só desativa). Imagem: DELETE só para admin.
    expect(escrita.some((politica) => politica.tabela === "paginas_institucionais" && politica.comando === "delete")).toBe(false);
    expect(escrita.some((politica) => politica.tabela === "produto_imagens" && politica.comando === "delete")).toBe(true);
  });

  it("leitura pública preservada: anon e cliente veem só página ativa / imagem de produto ativo", () => {
    const politicas = [...aplicarMigrations(lerMigrations()).values()];
    const leitura = (tabela: string, papel: string) =>
      politicas.filter((politica) => politica.tabela === tabela && politica.comando === "select" && politica.papeis.includes(papel));

    for (const papel of ["anon", "authenticated"]) {
      expect(leitura("paginas_institucionais", papel).some((politica) => /using \(ativo\)/i.test(politica.definicao))).toBe(true);
      expect(
        leitura("produto_imagens", papel).some((politica) => /produtos\.ativo/i.test(politica.definicao)),
      ).toBe(true);
    }
    // Nenhum SELECT de authenticated com using (true) nessas tabelas.
    expect(leitura("paginas_institucionais", "authenticated").some((politica) => politica.usingTrue)).toBe(false);
    expect(leitura("produto_imagens", "authenticated").some((politica) => politica.usingTrue)).toBe(false);
  });
});

describe("parser de políticas (o teste acima não pode passar por engano)", () => {
  it("detecta escrita aberta, inclusive sem cláusula TO (= public)", () => {
    const politicas = aplicarMigrations([
      {
        nome: "x.sql",
        sql: `
          create policy "a" on t for insert to authenticated with check (true);
          create policy "b" on t for all using (true);
          create policy "c" on t for select to authenticated using (true);
          create policy "d" on t for update to authenticated using (is_admin()) with check (is_admin());
        `,
      },
    ]);
    expect(politicasDeEscritaAbertas(politicas)).toEqual(['t: "a" (x.sql)', 't: "b" (x.sql)']);
  });

  it("uma política aberta removida por drop policy numa migration seguinte deixa de contar", () => {
    const politicas = aplicarMigrations([
      { nome: "1.sql", sql: `create policy "a" on public.t for insert to authenticated with check (true);` },
      { nome: "2.sql", sql: `drop policy if exists "a" on t; create policy "a" on t for insert to authenticated with check (is_admin());` },
    ]);
    expect(politicasDeEscritaAbertas(politicas)).toEqual([]);
  });

  it("ignora ';' e 'create policy' dentro de corpos $$...$$ e de comentários", () => {
    const politicas = aplicarMigrations([
      {
        nome: "x.sql",
        sql: `
          -- create policy "comentario" on t for insert to authenticated with check (true);
          do $$ begin execute 'create policy "dinamica" on t for insert with check (true)'; end $$;
        `,
      },
    ]);
    expect(politicasDeEscritaAbertas(politicas)).toEqual([]);
  });
});
