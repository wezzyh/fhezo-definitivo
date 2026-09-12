// APPSEC-003 — o cadastro nunca assume um cadastro que já existe. CPF/CNPJ
// que já está em "clientes" (com conta ou de uma compra antiga sem conta) é
// recusado, sem criar login e sem tocar na linha existente.

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ criarClienteSupabaseServidor: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/url-site", () => ({ obterUrlBaseSite: vi.fn(async () => "http://localhost:3000") }));

import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { criarContaCliente } from "./actions";

const SENHA = "Rolamento-Azul-2026!";
const ENDERECO = {
  cep: "01310-100",
  logradouro: "Av. Paulista",
  numero: "1000",
  semNumero: false,
  complemento: "",
  referencia: "",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
};
const ENTREGA_VAZIA = {
  cep: "",
  logradouro: "",
  numero: "",
  semNumero: false,
  complemento: "",
  referencia: "",
  bairro: "",
  cidade: "",
  uf: "",
};

function camposComuns(email: string) {
  return {
    acesso: { email, senha: SENHA, confirmacaoSenha: SENHA },
    endereco: ENDERECO,
    entregaDiferente: false,
    entrega: ENTREGA_VAZIA,
    aceiteTermos: true,
    aceiteMarketing: false,
  };
}

const CADASTRO_PF = {
  tipo: "PF",
  pf: { nomeCompleto: "Maria Silva", cpf: "529.982.247-25", dataNascimento: "1990-05-10", celular: "(11) 91234-5678" },
  ...camposComuns("maria@exemplo.com"),
};

const CADASTRO_PJ = {
  tipo: "PJ",
  pj: {
    razaoSocial: "Fhezo Teste Ltda",
    nomeFantasia: "",
    cnpj: "11.222.333/0001-81",
    inscricaoEstadual: "",
    ieIsento: true,
    telefoneComercial: "(11) 3456-7890",
    responsavelNome: "João Souza",
  },
  fiscal: {
    contribuinteIcms: "nao",
    finalidadeCompra: "uso_consumo",
    regimeTributario: "simples_nacional",
    inscricaoMunicipal: "",
    inscricaoSuframa: "",
  },
  ...camposComuns("compras@empresa-teste.com"),
};

/** Dublês do Supabase: guarda toda busca, inserção e atualização em "clientes". */
function prepararBanco({
  existentes = [] as { id: string }[],
  erroBusca = null as { message: string } | null,
  erroInsercao = null as { code: string } | null,
} = {}) {
  const registro = {
    buscas: [] as [string, string[]][],
    inseridos: [] as Record<string, unknown>[],
    atualizados: [] as unknown[],
  };
  const deleteUser = vi.fn(async () => ({ data: null, error: null }));
  vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
    from: () => ({
      select: () => ({
        in: (coluna: string, valores: string[]) => {
          registro.buscas.push([coluna, valores]);
          return {
            limit: () => ({
              returns: async () => ({ data: erroBusca ? null : existentes, error: erroBusca }),
            }),
          };
        },
      }),
      insert: async (linha: Record<string, unknown>) => {
        registro.inseridos.push(linha);
        return { error: erroInsercao };
      },
      update: (linha: unknown) => {
        registro.atualizados.push(linha);
        return { eq: async () => ({ error: null }) };
      },
    }),
    auth: { admin: { deleteUser } },
  } as never);

  const auth = {
    signUp: vi.fn(async () => ({
      data: { user: { id: "usuario-novo", identities: [{ id: "identidade" }] }, session: { access_token: "sessao" } },
      error: null,
    })),
    signOut: vi.fn(async () => ({ error: null })),
  };
  vi.mocked(criarClienteSupabaseServidor).mockResolvedValue({ auth } as never);

  return { registro, auth, deleteUser };
}

describe("cadastro × CPF/CNPJ que já existe (APPSEC-003)", () => {
  it("CNPJ de um cadastro antigo SEM conta: recusa, não cria login e não toca na linha existente", async () => {
    const { registro, auth } = prepararBanco({ existentes: [{ id: "cliente-antigo" }] });

    const resultado = await criarContaCliente(CADASTRO_PJ, "/conta");

    expect(resultado.errosCampos?.["pj.cnpj"]).toContain("já tem cadastro");
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(registro.inseridos).toEqual([]);
    expect(registro.atualizados).toEqual([]);
  });

  it("CPF de uma conta existente: mesma recusa e mesma mensagem (não revela se o documento tem conta)", async () => {
    const { auth, registro } = prepararBanco({ existentes: [{ id: "cliente-com-conta" }] });
    const pf = await criarContaCliente(CADASTRO_PF, "/conta");
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(registro.atualizados).toEqual([]);

    prepararBanco({ existentes: [{ id: "cliente-antigo" }] });
    const pj = await criarContaCliente(CADASTRO_PJ, "/conta");

    expect(pf.errosCampos?.["pf.cpf"]).toBeTruthy();
    expect(pf.errosCampos?.["pf.cpf"]).toBe(pj.errosCampos?.["pj.cnpj"]);
  });

  it("procura o documento só com dígitos e com a máscara usual (registros antigos formatados)", async () => {
    const pf = prepararBanco({ existentes: [{ id: "x" }] });
    await criarContaCliente(CADASTRO_PF, "/conta");
    expect(pf.registro.buscas).toEqual([["documento", ["52998224725", "529.982.247-25"]]]);

    const pj = prepararBanco({ existentes: [{ id: "x" }] });
    await criarContaCliente(CADASTRO_PJ, "/conta");
    expect(pj.registro.buscas).toEqual([["documento", ["11222333000181", "11.222.333/0001-81"]]]);
  });

  it("documento novo: cria uma linha NOVA ligada à conta nova — nunca update de linha existente", async () => {
    const { registro } = prepararBanco();

    const resultado = await criarContaCliente(CADASTRO_PF, "/checkout/identificacao");

    expect(resultado.destino).toBe("/checkout/identificacao");
    expect(registro.atualizados).toEqual([]);
    expect(registro.inseridos).toEqual([
      expect.objectContaining({
        tipo: "PF",
        documento: "52998224725",
        email: "maria@exemplo.com",
        auth_user_id: "usuario-novo",
      }),
    ]);
  });

  it("e-mail igual ao de um cadastro antigo não vincula nada: a única busca é por documento", async () => {
    const { registro } = prepararBanco();
    await criarContaCliente(CADASTRO_PF, "/conta");
    expect(registro.buscas.map(([coluna]) => coluna)).toEqual(["documento"]);
    expect(registro.atualizados).toEqual([]);
  });

  it("corrida: outro cadastro com o mesmo documento vence (23505) → desfaz o login recém-criado e recusa", async () => {
    const { auth, deleteUser } = prepararBanco({ erroInsercao: { code: "23505" } });

    const resultado = await criarContaCliente(CADASTRO_PF, "/conta");

    expect(resultado.errosCampos?.["pf.cpf"]).toContain("já tem cadastro");
    expect(auth.signOut).toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith("usuario-novo");
  });

  it("outra falha ao gravar o cliente: desfaz o login recém-criado, erro genérico sem detalhe do banco", async () => {
    const { auth, deleteUser } = prepararBanco({ erroInsercao: { code: "42501" } });

    const resultado = await criarContaCliente(CADASTRO_PF, "/conta");

    expect(resultado).toEqual({ erro: expect.stringContaining("Não foi possível criar sua conta") });
    expect(auth.signOut).toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith("usuario-novo");
  });

  it("e-mail já cadastrado (usuário fictício sem identidades): não grava cliente nenhum", async () => {
    const { auth, registro } = prepararBanco();
    auth.signUp.mockResolvedValueOnce({
      data: { user: { id: "usuario-ficticio", identities: [] }, session: null },
      error: null,
    } as never);

    const resultado = await criarContaCliente(CADASTRO_PF, "/conta");

    expect(resultado.erro).toContain("Não foi possível criar a conta com este e-mail");
    expect(registro.inseridos).toEqual([]);
  });

  it("destino externo em 'proximo' não vira redirecionamento aberto", async () => {
    prepararBanco();
    const resultado = await criarContaCliente(CADASTRO_PF, "//atacante.example/phishing");
    expect(resultado.destino?.startsWith("//")).toBe(false);
    expect(resultado.destino?.startsWith("/")).toBe(true);
  });

  it("falha ao consultar o documento: não cria login (falha fechado)", async () => {
    const { auth } = prepararBanco({ erroBusca: { message: "offline" } });

    const resultado = await criarContaCliente(CADASTRO_PF, "/conta");

    expect(resultado.erro).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});
