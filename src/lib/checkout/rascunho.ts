import { z } from "zod";
const texto = z.string().max(300);
export const esquemaRascunhoCheckout = z.object({
  contaId: z.string().uuid().nullable().default(null),
  tipoCliente: z.enum(["PF", "PJ"]),
  dadosPF: z.object({
    nomeCompleto: texto,
    cpf: texto,
    email: texto,
    telefone: texto,
  }),
  dadosPJ: z.object({
    razaoSocial: texto,
    cnpj: texto,
    inscricaoEstadual: texto,
    email: texto,
    telefone: texto,
  }),
  endereco: z.object({
    cep: texto,
    rua: texto,
    numero: texto,
    complemento: texto,
    bairro: texto,
    cidade: texto,
    uf: texto,
  }),
  cotacao: z
    .object({
      chave: z.string(),
      expira: z.number(),
      frete: z.object({
        id: z.number().int().nonnegative(),
        nome: texto,
        transportadora: texto,
        prazoDias: z.number().nonnegative(),
        valor: z.number().finite().nonnegative(),
      }),
    })
    .nullable(),
  confirmado: z.boolean(),
  clienteId: z.string().uuid().nullable(),
  checkoutId: z.string().uuid(),
  formaPagamento: z.enum(["pix", "boleto", "cartao"]),
  pedidoId: z.string().uuid().nullable(),
});
export type RascunhoCheckout = z.infer<typeof esquemaRascunhoCheckout>;
export const CHAVE_CHECKOUT = "fhezo:checkout:v1";
export function chaveCotacao(
  cep: string,
  itens: readonly {
    produtoId: string;
    quantidade: number;
    preco: number;
    estoque: number;
  }[],
) {
  return JSON.stringify([
    cep.replace(/\D/g, ""),
    itens
      .map((i) => [i.produtoId, i.quantidade, i.preco, i.estoque])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ]);
}
