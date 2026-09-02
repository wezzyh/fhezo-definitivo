"use server";

import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import type { TipoClienteCheckout, DadosPF, DadosPJ } from "@/lib/checkout/tipos";
import type { Cliente, TipoPessoa } from "@/types/database";

// Grava (ou atualiza, se já existir pelo CPF/CNPJ) o cliente na tabela
// "clientes" ao avançar da etapa de dados para a de pagamento. Usa a
// service_role key porque quem faz checkout aqui é um visitante do site,
// sem sessão de admin — e "clientes" precisa continuar gravável só a
// partir de código de servidor confiável, nunca direto do navegador.

export type ResultadoSalvarCliente =
  | { sucesso: true; clienteId: string }
  | { sucesso: false; mensagem: string };

interface SalvarClienteInput {
  tipoCliente: TipoClienteCheckout;
  dadosPF: DadosPF;
  dadosPJ: DadosPJ;
}

export async function salvarClienteCheckout(
  input: SalvarClienteInput,
): Promise<ResultadoSalvarCliente> {
  const dados: {
    tipo: TipoPessoa;
    nome_razao_social: string;
    documento: string;
    email: string;
    telefone: string;
  } =
    input.tipoCliente === "PF"
      ? {
          tipo: "PF",
          nome_razao_social: input.dadosPF.nomeCompleto.trim(),
          documento: input.dadosPF.cpf.replace(/\D/g, ""),
          email: input.dadosPF.email.trim(),
          telefone: input.dadosPF.telefone.replace(/\D/g, ""),
        }
      : {
          tipo: "PJ",
          nome_razao_social: input.dadosPJ.razaoSocial.trim(),
          documento: input.dadosPJ.cnpj.replace(/\D/g, ""),
          email: input.dadosPJ.email.trim(),
          telefone: input.dadosPJ.telefone.replace(/\D/g, ""),
        };

  if (!dados.nome_razao_social || !dados.documento || !dados.email) {
    return { sucesso: false, mensagem: "Preencha todos os dados obrigatórios antes de continuar." };
  }

  let supabase;
  try {
    supabase = criarClienteSupabaseAdmin();
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível salvar seus dados agora. Tente novamente em instantes.",
    };
  }

  const { data: existentes, error: erroBusca } = await supabase
    .from("clientes")
    .select("id")
    .eq("documento", dados.documento)
    .limit(1)
    .returns<Pick<Cliente, "id">[]>();

  if (erroBusca) {
    return { sucesso: false, mensagem: `Erro ao verificar cadastro: ${erroBusca.message}` };
  }

  const existente = existentes?.[0];

  if (existente) {
    const { error: erroUpdate } = await supabase
      .from("clientes")
      .update(dados)
      .eq("id", existente.id);

    if (erroUpdate) {
      return { sucesso: false, mensagem: `Erro ao atualizar cadastro: ${erroUpdate.message}` };
    }

    return { sucesso: true, clienteId: existente.id };
  }

  const { data: criado, error: erroInsert } = await supabase
    .from("clientes")
    .insert(dados)
    .select("id")
    .single<Pick<Cliente, "id">>();

  if (erroInsert || !criado) {
    return {
      sucesso: false,
      mensagem: `Erro ao salvar cadastro: ${erroInsert?.message ?? "erro desconhecido"}`,
    };
  }

  return { sucesso: true, clienteId: criado.id };
}
