import { validarCPF, validarCNPJ } from "./validar-documento";
import type {
  DadosPF,
  DadosPJ,
  EnderecoEntrega,
  TipoClienteCheckout,
} from "./tipos";
export function errosIdentificacao({
  tipoCliente,
  dadosPF,
  dadosPJ,
  endereco,
}: {
  tipoCliente: TipoClienteCheckout;
  dadosPF: DadosPF;
  dadosPJ: DadosPJ;
  endereco?: EnderecoEntrega;
}) {
  const erros: string[] = [];
  const pf = tipoCliente === "PF";
  const dados = pf ? dadosPF : dadosPJ;
  if (!(pf ? dadosPF.nomeCompleto : dadosPJ.razaoSocial).trim())
    erros.push(pf ? "Informe o nome completo." : "Informe a razão social.");
  if (!(pf ? validarCPF(dadosPF.cpf) : validarCNPJ(dadosPJ.cnpj)))
    erros.push(pf ? "Informe um CPF válido." : "Informe um CNPJ válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim()))
    erros.push("Informe um email válido.");
  if (!/^\d{10,11}$/.test(dados.telefone.replace(/\D/g, "")))
    erros.push("Informe um telefone com DDD.");
  if (endereco) {
    const cep = endereco.cep.replace(/\D/g, "");
    if (!/^\d{8}$/.test(cep) || cep === "00000000")
      erros.push("Informe um CEP válido.");
    for (const [campo, label] of [
      ["rua", "a rua"],
      ["numero", "o número"],
      ["bairro", "o bairro"],
      ["cidade", "a cidade"],
    ] as const)
      if (!endereco[campo].trim()) erros.push("Informe " + label + ".");
    if (
      ![
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
      ].includes(endereco.uf)
    )
      erros.push("Selecione o estado (UF).");
  }
  return erros;
}
