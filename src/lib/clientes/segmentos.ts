// Lista pré-definida de segmentos de cliente B2B — escolhida em vez de
// texto totalmente livre para o filtro "por segmento" em /admin/clientes
// sempre bater com um conjunto fechado de valores, sem fragmentar o mesmo
// segmento em grafias diferentes ("Indústria" vs "industria" vs "Ind.").
// A coluna no banco (clientes_crm.segmento) continua um `text` livre, sem
// CHECK constraint — um valor fora desta lista (digitado antes de existir
// este padrão, ou um caso que não se encaixa) continua sendo salvo e
// exibido normalmente, só não aparece como opção nova no filtro.
export const SEGMENTOS_CLIENTE = [
  "Indústria",
  "Manutenção",
  "Revenda",
  "Construção Civil",
  "Distribuição",
  "Outro",
] as const;
