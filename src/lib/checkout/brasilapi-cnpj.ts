// Busca de dados cadastrais por CNPJ na BrasilAPI. O preenchimento automático
// é um bônus para agilizar o formulário — se falhar, o usuário preenche os
// dados manualmente, sem travar o checkout.

export interface DadosCnpjBrasilApi {
  razaoSocial: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type ResultadoBuscaCnpj =
  | { sucesso: true; dados: DadosCnpjBrasilApi }
  | { sucesso: false; mensagem: string };

export async function buscarDadosPorCnpj(cnpj: string): Promise<ResultadoBuscaCnpj> {
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  if (cnpjLimpo.length !== 14) {
    return { sucesso: false, mensagem: "Digite um CNPJ com 14 números para buscar os dados." };
  }

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);

    if (!resposta.ok) {
      return {
        sucesso: false,
        mensagem: "Não encontramos esse CNPJ. Confira o número ou preencha os dados manualmente.",
      };
    }

    const dados = await resposta.json();

    return {
      sucesso: true,
      dados: {
        razaoSocial: dados.razao_social ?? "",
        cep: dados.cep ? String(dados.cep) : "",
        logradouro: dados.logradouro ?? "",
        numero: dados.numero ?? "",
        bairro: dados.bairro ?? "",
        cidade: dados.municipio ?? "",
        uf: dados.uf ?? "",
      },
    };
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.",
    };
  }
}
