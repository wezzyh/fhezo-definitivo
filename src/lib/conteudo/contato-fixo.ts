// Dados de contato usados tanto no Header quanto no Footer do site
// público. Sem nenhum dado real de contato cadastrado no projeto (nem
// .env, nem CMS) até agora — mantidos exatamente como em
// referencia-novo-frontend/ (decisão do usuário ao integrar o Header:
// usar os valores literais da referência em vez de inventar outros).
// Centralizado aqui pra Header e Footer nunca divergirem entre si.
export const CONTATO_FIXO = {
  whatsappNumero: "55419935156006",
  telefoneExibicao: "(51) 99351-56006",
  telefoneTel: "+55419935156006",
  email: "sac@fhezo.com.br",
  endereco: "Curitiba - PR e região",
  horarioDias: "Segunda a sexta-feira",
  horarioHoras: "08:00 às 17:30",
} as const;
