"use server";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { errosIdentificacao } from "@/lib/checkout/validar-identificacao";
import { validarCNPJ, validarCPF } from "@/lib/checkout/validar-documento";
import type { Cliente } from "@/types/database";
export type PerfilCheckout = Pick<
  Cliente,
  | "id"
  | "tipo"
  | "nome"
  | "documento"
  | "email"
  | "telefone"
  | "endereco_cep"
  | "endereco_rua"
  | "endereco_numero"
  | "endereco_complemento"
  | "endereco_bairro"
  | "endereco_cidade"
  | "endereco_uf"
>;
export async function carregarIdentificacaoCheckout(): Promise<
  | { sucesso: true; cliente: PerfilCheckout }
  | { sucesso: false; login: boolean; mensagem: string }
> {
  try {
    const sessao = await obterClienteLogado();
    if (!sessao)
      return {
        sucesso: false,
        login: true,
        mensagem: "Crie sua conta ou entre para continuar o pedido.",
      };
    if (!sessao.cliente)
      return {
        sucesso: false,
        login: false,
        mensagem:
          "Sua conta ainda não tem um cadastro de cliente vinculado. Fale com o suporte para concluir o pedido.",
      };
    const c = sessao.cliente;
    return {
      sucesso: true,
      cliente: {
        id: c.id,
        tipo: c.tipo,
        nome: c.nome,
        documento: c.documento,
        email: c.email,
        telefone: c.telefone,
        endereco_cep: c.endereco_cep,
        endereco_rua: c.endereco_rua,
        endereco_numero: c.endereco_numero,
        endereco_complemento: c.endereco_complemento,
        endereco_bairro: c.endereco_bairro,
        endereco_cidade: c.endereco_cidade,
        endereco_uf: c.endereco_uf,
      },
    };
  } catch {
    return {
      sucesso: false,
      login: false,
      mensagem: "Não foi possível carregar sua conta. Tente novamente.",
    };
  }
}
export async function salvarClienteCheckout(): Promise<
  { sucesso: true; clienteId: string } | { sucesso: false; mensagem: string }
> {
  const resultado = await carregarIdentificacaoCheckout();
  if (!resultado.sucesso) return resultado;
  const c = resultado.cliente;
  // CPF/CNPJ não é editável pelo cliente (migração 0033, APPSEC-010):
  // mandar "atualizar em Minha conta" seria um beco sem saída.
  if (!(c.tipo === "PF" ? validarCPF(c.documento) : validarCNPJ(c.documento)))
    return {
      sucesso: false,
      mensagem:
        "O CPF/CNPJ do seu cadastro precisa ser conferido. Fale com o suporte para concluir o pedido.",
    };
  const erros = errosIdentificacao({
    tipoCliente: c.tipo,
    dadosPF: {
      nomeCompleto: c.nome,
      cpf: c.documento,
      email: c.email,
      telefone: c.telefone ?? "",
    },
    dadosPJ: {
      razaoSocial: c.nome,
      cnpj: c.documento,
      email: c.email,
      telefone: c.telefone ?? "",
      inscricaoEstadual: "",
    },
  });
  if (erros.length)
    return {
      sucesso: false,
      mensagem: erros[0] + " Atualize seu cadastro em Minha conta.",
    };
  return { sucesso: true, clienteId: c.id };
}
