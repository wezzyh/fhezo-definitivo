// Regras de precificação exibidas na loja pública (preço "de/por", Pix e
// parcelamento). São só informativas — não alteram o valor real cobrado no
// checkout (que continua sendo "preco" via Asaas, sem desconto automático
// de Pix nem parcelamento com juros calculado aqui).

/** Desconto fixo exibido para pagamento via Pix. Fácil de ajustar depois. */
const DESCONTO_PIX = 0.05;

/** Máximo de parcelas sem juros a oferecer, respeitando o valor mínimo abaixo. */
const MAXIMO_PARCELAS = 6;

/** Não parcela abaixo deste valor por parcela — reduz o número de parcelas. */
const VALOR_MINIMO_PARCELA = 50;

export interface InfoDesconto {
  temDesconto: boolean;
  percentualDesconto: number;
}

/** "De/por": preco_de riscado (quando maior que preco) vira o "de"; preco é o "por". */
export function calcularDesconto(preco: number, precoDe: number | null | undefined): InfoDesconto {
  if (!precoDe || precoDe <= preco) {
    return { temDesconto: false, percentualDesconto: 0 };
  }

  const percentualDesconto = Math.round(((precoDe - preco) / precoDe) * 100);
  return { temDesconto: true, percentualDesconto };
}

/** Preço à vista no Pix, com o desconto fixo aplicado sobre "preco". */
export function calcularPrecoPix(preco: number): number {
  return preco * (1 - DESCONTO_PIX);
}

export interface InfoParcelamento {
  parcelas: number;
  valorParcela: number;
}

/**
 * Até MAXIMO_PARCELAS vezes sem juros, reduzindo o número de parcelas se a
 * parcela ficar abaixo de VALOR_MINIMO_PARCELA (ex.: R$120 vira 2x de R$60,
 * não 6x de R$20).
 */
export function calcularParcelamento(preco: number): InfoParcelamento {
  const parcelasPossiveis = Math.max(1, Math.min(MAXIMO_PARCELAS, Math.floor(preco / VALOR_MINIMO_PARCELA)));
  return { parcelas: parcelasPossiveis, valorParcela: preco / parcelasPossiveis };
}
