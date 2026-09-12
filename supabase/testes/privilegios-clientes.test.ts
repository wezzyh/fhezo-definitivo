// Teste estrutural dos privilégios de "clientes" (APPSEC-010). Repassa todos
// os GRANT/REVOKE das migrations em ordem, partindo do padrão do Supabase
// (anon e authenticated com todos os privilégios nas tabelas de "public"),
// e confere o estado final: o cliente só altera as colunas que a tela
// /conta grava.
//
// Limite: vê só o que está nas migrations. Privilégio dado direto no painel
// não aparece aqui — para isso, a seção 5 de
// supabase/testes/identidade_appsec_003_004_010.sql no banco real.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PASTA_MIGRATIONS = fileURLToPath(new URL("../migrations/", import.meta.url));
const ACOES_CONTA = fileURLToPath(new URL("../../src/app/(site)/conta/actions.ts", import.meta.url));

const PRIVILEGIOS_DE_TABELA = ["select", "insert", "update", "delete", "truncate", "references", "trigger"];

/** Exatamente o que /conta grava (atualizarDadosCliente + atualizarEnderecoCliente). */
const COLUNAS_EDITAVEIS = [
  "nome",
  "telefone",
  "endereco_cep",
  "endereco_rua",
  "endereco_numero",
  "endereco_complemento",
  "endereco_bairro",
  "endereco_cidade",
  "endereco_uf",
];

interface Privilegios {
  tabela: Set<string>;
  colunasUpdate: Set<string>;
}

/** Comandos SQL de um arquivo, sem comentários e sem corpos $$...$$. */
function comandosSql(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "$$corpo$$")
    .split(";")
    .map((comando) => comando.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function privilegiosFinais(migrations: { nome: string; sql: string }[]): Map<string, Privilegios> {
  const estado = new Map<string, Privilegios>(
    ["anon", "authenticated"].map((papel) => [papel, { tabela: new Set(PRIVILEGIOS_DE_TABELA), colunasUpdate: new Set() }]),
  );

  for (const { sql } of migrations) {
    for (const comando of comandosSql(sql)) {
      const m = /^(grant|revoke) (.+?) on (?:table )?(?:public\.)?"?clientes"? (?:to|from) ([\w, ]+)$/i.exec(comando);
      if (!m) continue;
      const concede = m[1].toLowerCase() === "grant";
      const itens = [...m[2].matchAll(/(\w+)(?:\s*\(([^)]*)\))?/g)].map(([, nome, colunas]) => ({
        nome: nome.toLowerCase(),
        colunas: colunas?.split(",").map((coluna) => coluna.trim()),
      }));

      for (const papel of m[3].split(",").map((p) => p.trim().toLowerCase())) {
        const alvo = estado.get(papel);
        if (!alvo) continue;
        for (const { nome, colunas } of itens) {
          if (nome === "privileges") continue;
          for (const privilegio of nome === "all" ? PRIVILEGIOS_DE_TABELA : [nome]) {
            if (colunas && privilegio === "update") {
              for (const coluna of colunas) {
                if (concede) alvo.colunasUpdate.add(coluna);
                else alvo.colunasUpdate.delete(coluna);
              }
            } else if (!colunas) {
              if (concede) {
                alvo.tabela.add(privilegio);
              } else {
                alvo.tabela.delete(privilegio);
                // Revogar o UPDATE da tabela revoga também os UPDATE por coluna.
                if (privilegio === "update") alvo.colunasUpdate.clear();
              }
            }
          }
        }
      }
    }
  }
  return estado;
}

function lerMigrations(): { nome: string; sql: string }[] {
  return readdirSync(PASTA_MIGRATIONS)
    .filter((arquivo) => arquivo.endsWith(".sql"))
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(`${PASTA_MIGRATIONS}${nome}`, "utf8") }));
}

describe("privilégios de clientes nas migrations (APPSEC-010)", () => {
  it("cliente autenticado: só SELECT na tabela e UPDATE só nas colunas de /conta", () => {
    const authenticated = privilegiosFinais(lerMigrations()).get("authenticated")!;
    expect([...authenticated.tabela]).toEqual(["select"]);
    expect([...authenticated.colunasUpdate].sort()).toEqual([...COLUNAS_EDITAVEIS].sort());
    for (const protegida of ["documento", "email", "tipo", "auth_user_id", "id", "created_at"]) {
      expect(authenticated.colunasUpdate.has(protegida), protegida).toBe(false);
    }
  });

  it("anon: nenhum privilégio em clientes", () => {
    const anon = privilegiosFinais(lerMigrations()).get("anon")!;
    expect([...anon.tabela]).toEqual([]);
    expect([...anon.colunasUpdate]).toEqual([]);
  });

  it("sem a 0033, o cliente tem UPDATE na tabela inteira (prova que o teste pega o bug)", () => {
    const semCorrecao = lerMigrations().filter((migration) => !migration.nome.startsWith("0033_"));
    expect(privilegiosFinais(semCorrecao).get("authenticated")!.tabela.has("update")).toBe(true);
  });

  it("a tela /conta só grava colunas liberadas (não quebra Minha conta)", () => {
    const fonte = readFileSync(ACOES_CONTA, "utf8");
    const gravadas = new Set([...fonte.matchAll(/\b(endereco_[a-z]+)\s*:/g)].map((m) => m[1]));
    if (/\.update\(\{\s*nome,\s*telefone/.test(fonte)) {
      gravadas.add("nome");
      gravadas.add("telefone");
    }
    expect([...gravadas].sort()).toEqual([...COLUNAS_EDITAVEIS].sort());
  });

  it('a política "Cliente edita os proprios dados" continua exigindo auth_user_id = auth.uid()', () => {
    const migrations = lerMigrations();
    const criacao = migrations.find((migration) => migration.nome.startsWith("0018_"))!;
    expect(criacao.sql).toMatch(
      /"Cliente edita os proprios dados" on clientes for update to authenticated using \(auth_user_id = auth\.uid\(\)\) with check \(auth_user_id = auth\.uid\(\)\)/,
    );
    const posteriores = migrations.filter((migration) => migration.nome > criacao.nome);
    for (const migration of posteriores) {
      expect(migration.sql, migration.nome).not.toMatch(/drop policy[^;]*"Cliente edita os proprios dados"/i);
    }
  });
});

describe("parser de privilégios (o teste acima não pode passar por engano)", () => {
  it("revogar o UPDATE da tabela apaga UPDATE por coluna dado antes", () => {
    const estado = privilegiosFinais([
      {
        nome: "x.sql",
        sql: `
          grant update (documento) on clientes to authenticated;
          revoke insert, update, delete on table clientes from authenticated;
          grant update ( nome,
            telefone ) on table public.clientes to authenticated;
        `,
      },
    ]);
    const authenticated = estado.get("authenticated")!;
    expect([...authenticated.colunasUpdate].sort()).toEqual(["nome", "telefone"]);
    expect(authenticated.tabela.has("update")).toBe(false);
    expect(authenticated.tabela.has("insert")).toBe(false);
    expect(authenticated.tabela.has("select")).toBe(true);
  });

  it("ignora comandos de outras tabelas e de dentro de $$...$$", () => {
    const estado = privilegiosFinais([
      {
        nome: "x.sql",
        sql: `
          revoke all on table clientes_crm from authenticated;
          do $$ begin execute 'revoke all on clientes from authenticated'; end $$;
        `,
      },
    ]);
    expect(estado.get("authenticated")!.tabela.size).toBe(PRIVILEGIOS_DE_TABELA.length);
  });
});
