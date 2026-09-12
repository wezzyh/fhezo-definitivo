import "server-only";

// Frete do pedido — APPSEC-001. O navegador só informa QUAL serviço escolheu
// (id da opção do Melhor Envio). O valor é sempre recalculado aqui, no
// momento de criar o pedido, com:
// - o CEP deste pedido (não o de uma cotação anterior);
// - os produtos e quantidades deste pedido (não os de um carrinho anterior);
// - peso, dimensões e preço lidos do BANCO (não do carrinho do navegador).
// Qualquer falha devolve erro: não existe frete "a combinar" nem frete zero
// de reserva — sem cotação válida, o checkout não prossegue.

import type { Produto } from "@/types/database";
import { MENSAGEM_FRETE_INDISPONIVEL, cotarFreteMelhorEnvio, type ItemParaFrete, type OpcaoFrete } from "@/lib/frete/cotacao";

export type ProdutoParaFrete = Pick<Produto, "id" | "preco" | "peso_kg" | "altura_cm" | "largura_cm" | "comprimento_cm">;

export type ResultadoFretePedido = { sucesso: true; frete: OpcaoFrete } | { sucesso: false; mensagem: string };

export const MENSAGEM_FRETE_OPCAO_INVALIDA =
  "Não foi possível validar a opção de entrega selecionada. Recalcule o frete e tente novamente.";

const MENSAGEM_FRETE_PRODUTO_SEM_MEDIDAS =
  "Não foi possível calcular o frete de um dos produtos do carrinho. Fale com a loja para concluir a compra.";

/** Número finito e maior que zero (aceita o texto numérico que o Postgres às vezes devolve para `numeric`). */
function numeroPositivo(valor: unknown): number | null {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  return typeof numero === "number" && Number.isFinite(numero) && numero > 0 ? numero : null;
}

/**
 * Itens da cotação a partir dos dados do banco. null se algum produto não
 * tiver peso/dimensões válidos ou preço válido — falha fechado, sem inventar
 * medida padrão (uma medida inventada daria um frete errado, para mais ou
 * para menos).
 */
export function montarItensFrete(
  itens: readonly { produtoId: string; quantidade: number }[],
  produtos: ReadonlyMap<string, ProdutoParaFrete>,
): ItemParaFrete[] | null {
  const resultado: ItemParaFrete[] = [];

  for (const item of itens) {
    const produto = produtos.get(item.produtoId);
    if (!produto) return null;

    const pesoKg = numeroPositivo(produto.peso_kg);
    const alturaCm = numeroPositivo(produto.altura_cm);
    const larguraCm = numeroPositivo(produto.largura_cm);
    const comprimentoCm = numeroPositivo(produto.comprimento_cm);
    const preco = Number(produto.preco);
    if (pesoKg === null || alturaCm === null || larguraCm === null || comprimentoCm === null) return null;
    if (!Number.isFinite(preco) || preco < 0) return null;

    resultado.push({
      id: produto.id,
      pesoKg,
      alturaCm,
      larguraCm,
      comprimentoCm,
      valorUnitario: preco,
      quantidade: item.quantidade,
    });
  }

  return resultado;
}

export async function calcularFreteDoPedido(
  cepDestino: string,
  itens: readonly { produtoId: string; quantidade: number }[],
  produtos: ReadonlyMap<string, ProdutoParaFrete>,
  servicoId: number,
): Promise<ResultadoFretePedido> {
  const itensFrete = montarItensFrete(itens, produtos);
  if (!itensFrete) {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_PRODUTO_SEM_MEDIDAS };
  }

  let cotacao;
  try {
    cotacao = await cotarFreteMelhorEnvio(cepDestino, itensFrete);
  } catch {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
  }

  // Mensagem genérica de propósito: o detalhe (token, CEP, API fora) não
  // ajuda o comprador e não precisa ser exposto.
  if (!cotacao.sucesso) {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
  }

  const frete = cotacao.opcoes.find((opcao) => opcao.id === servicoId);
  if (!frete) {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_OPCAO_INVALIDA };
  }

  // cotarFreteMelhorEnvio já descarta preço inválido; conferido de novo
  // aqui porque é este número que vai para a cobrança.
  if (!Number.isFinite(frete.valor) || frete.valor < 0) {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
  }

  return { sucesso: true, frete };
}
