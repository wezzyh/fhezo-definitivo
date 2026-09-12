"use server";

// Server Action de cotação de frete para EXIBIÇÃO (checkout e drawer do
// carrinho). O valor devolvido aqui é só informativo: o que é cobrado é
// recalculado no servidor por criarPedido (src/lib/checkout/frete-pedido.ts),
// com peso/dimensões do banco — nunca com o valor que esta tela mostrou.
// A cotação em si fica em ./cotacao.ts, que não é chamável pelo navegador.

import { cotarFreteMelhorEnvio, type ItemParaFrete, type ResultadoFrete } from "./cotacao";

export type { ItemParaFrete, OpcaoFrete, ResultadoFrete } from "./cotacao";

export async function calcularOpcoesFrete(cepDestino: string, itens: ItemParaFrete[]): Promise<ResultadoFrete> {
  return cotarFreteMelhorEnvio(cepDestino, itens);
}
