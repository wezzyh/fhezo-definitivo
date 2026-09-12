import { z } from "zod";
import { validarCPF } from "@/lib/checkout/validar-documento";
import { validarNumeroCartao, validarValidadeCartao } from "./validar-cartao";
// Compartilhado pela UI e servidor. Mensagens constantes: nunca incluem valores recebidos.
export const esquemaDadosCartao = z.object({
  numero: z
    .string()
    .max(25)
    .regex(/^[\d ]+$/)
    .transform((v) => v.replace(/ /g, ""))
    .refine(validarNumeroCartao, "Número do cartão inválido."),
  nomeImpresso: z.string().trim().min(2).max(100),
  validade: z
    .string()
    .regex(/^\d{2}\/(\d{2}|\d{4})$/)
    .refine(validarValidadeCartao, "Validade inválida."),
  cvv: z.string().regex(/^\d{3,4}$/),
});
export const esquemaTitularCartao = z.object({
  nome: z.string().trim().min(2).max(200),
  cpf: z
    .string()
    .max(20)
    .refine(validarCPF)
    .transform((v) => v.replace(/\D/g, "")),
  email: z.string().trim().email().max(254),
  telefone: z
    .string()
    .max(30)
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^\d{10,11}$/.test(v)),
  cep: z
    .string()
    .max(10)
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^\d{8}$/.test(v) && v !== "00000000"),
  numeroEndereco: z.string().trim().min(1).max(30),
});
export const esquemaPagamentoCartao = z.object({
  cartao: esquemaDadosCartao,
  titularCartao: esquemaTitularCartao,
});
export type DadosCartaoForm = z.input<typeof esquemaDadosCartao>;
export type DadosTitularForm = z.input<typeof esquemaTitularCartao>;
