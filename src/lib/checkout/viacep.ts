// Busca de endereço por CEP na API pública do ViaCEP. Chamada direto do
// navegador (a API do ViaCEP permite CORS), sem precisar de rota própria.

export interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export type ResultadoBuscaCep =
  | { sucesso: true; endereco: EnderecoViaCep }
  | { sucesso: false; mensagem: string };

export async function buscarEnderecoPorCep(cep: string): Promise<ResultadoBuscaCep> {
  const cepLimpo = cep.replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    return { sucesso: false, mensagem: "Digite um CEP com 8 números para buscar o endereço." };
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

    if (!resposta.ok) {
      return {
        sucesso: false,
        mensagem: "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      };
    }

    const dados = await resposta.json();

    if (dados.erro) {
      return {
        sucesso: false,
        mensagem: "CEP não encontrado. Confira o número ou preencha o endereço manualmente.",
      };
    }

    return {
      sucesso: true,
      endereco: {
        cep: cepLimpo,
        logradouro: dados.logradouro ?? "",
        bairro: dados.bairro ?? "",
        localidade: dados.localidade ?? "",
        uf: dados.uf ?? "",
      },
    };
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
    };
  }
}
