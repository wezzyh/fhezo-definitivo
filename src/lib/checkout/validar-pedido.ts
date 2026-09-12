// Validação do payload de criação de pedido (criarPedido), no servidor.
// Tudo que chega aqui veio do navegador e pode ter sido adulterado — este
// esquema garante FORMA e LIMITES (tipos, tamanhos, quantidade inteira
// positiva). Regras de negócio que dependem do banco (produto existe, está
// ativo, tem estoque, preço atual) continuam em criarPedido, depois daqui.
//
// z.object descarta chaves desconhecidas: campos extras enviados por quem
// fabrica a requisição (ex.: "preco", "total") nunca chegam ao código.

import { z } from "zod";
import {
  esquemaDadosCartao,
  esquemaTitularCartao,
} from "@/lib/pagamento/dados-cartao";

/**
 * Teto TÉCNICO por item, não de negócio: o limite real é o estoque do
 * produto (o carrinho já limita a ele, e o servidor/banco conferem de novo).
 * Isto só barra números absurdos antes de virarem conta de ponto flutuante
 * ou estourarem a coluna inteira do Postgres.
 */
export const QUANTIDADE_MAXIMA_POR_ITEM = 100_000;

/**
 * Produtos DISTINTOS por pedido. Cada produto é uma chamada sequencial ao
 * banco para descontar estoque, então isto também limita o custo de um
 * único pedido. Aumente se um cliente B2B real precisar de mais.
 */
export const PRODUTOS_MAXIMOS_POR_PEDIDO = 100;

const texto = (maximo: number) => z.string().max(maximo);

const esquemaItemPedido = z.object({
  produtoId: z.guid({ error: "Produto inválido no carrinho." }),
  quantidade: z
    .number({ error: "Quantidade inválida no carrinho." })
    .int({ error: "Quantidade inválida no carrinho." })
    .min(1, { error: "Quantidade inválida no carrinho." })
    .max(QUANTIDADE_MAXIMA_POR_ITEM, {
      error: "Quantidade acima do permitido para um único pedido.",
    }),
});

export const esquemaCriarPedido = z.object({
  checkoutId: z.string().uuid(),
  totalEsperado: z.number().finite().positive().optional(),
  // Só conferência, nunca autoridade (APPSEC-004): o cliente do pedido vem
  // da sessão, em criarPedido. Se vier, precisa ser o mesmo da sessão.
  clienteId: z
    .guid({
      error: "Cadastro do cliente inválido. Volte à etapa de dados.",
    })
    .optional(),
  tipoCliente: z.enum(["PF", "PJ"]),
  dadosPF: z.object({
    nomeCompleto: texto(200),
    cpf: texto(20),
    email: texto(254),
    telefone: texto(30),
  }),
  dadosPJ: z.object({
    razaoSocial: texto(200),
    cnpj: texto(20),
    inscricaoEstadual: texto(30),
    email: texto(254),
    telefone: texto(30),
  }),
  endereco: z.object({
    cep: texto(10),
    rua: texto(200),
    numero: texto(30),
    complemento: texto(200),
    bairro: texto(100),
    cidade: texto(100),
    uf: texto(2),
  }),
  // Só o id do serviço escolhido na cotação. O VALOR do frete não faz parte
  // do contrato: é recalculado no servidor (APPSEC-001, ver
  // src/lib/checkout/frete-pedido.ts). Um "freteSelecionado.valor" mandado
  // por quem fabrica a requisição é descartado com as outras chaves extras.
  freteServicoId: z.number().int().nonnegative(),
  itens: z
    .array(esquemaItemPedido)
    .min(1, { error: "Seu carrinho está vazio." })
    .max(PRODUTOS_MAXIMOS_POR_PEDIDO, {
      error: "Pedido com itens demais. Divida em mais de um pedido.",
    }),
  formaPagamento: z.enum(["pix", "boleto", "cartao"]),
  cartao: esquemaDadosCartao.optional(),
  titularCartao: esquemaTitularCartao.optional(),
});

export type EntradaCriarPedido = z.output<typeof esquemaCriarPedido>;

export interface ItemPedidoAgrupado {
  produtoId: string;
  quantidade: number;
}

/**
 * Soma itens repetidos do mesmo produto ("A x3" + "A x4" → "A x7") ANTES de
 * qualquer checagem de estoque — senão cada linha passaria sozinha e o
 * total pedido ultrapassaria o estoque. Devolve null se a soma estourar o
 * teto por item.
 */
export function agruparItensPorProduto(
  itens: readonly ItemPedidoAgrupado[],
): ItemPedidoAgrupado[] | null {
  const totais = new Map<string, number>();
  for (const item of itens) {
    totais.set(
      item.produtoId,
      (totais.get(item.produtoId) ?? 0) + item.quantidade,
    );
  }

  const agrupados = [...totais].map(([produtoId, quantidade]) => ({
    produtoId,
    quantidade,
  }));
  return agrupados.some((item) => item.quantidade > QUANTIDADE_MAXIMA_POR_ITEM)
    ? null
    : agrupados;
}
