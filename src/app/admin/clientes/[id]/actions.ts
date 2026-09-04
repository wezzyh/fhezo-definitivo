"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export interface EstadoFormularioCrm {
  erro?: string;
  sucesso?: boolean;
}

export async function salvarCrmCliente(
  clienteId: string,
  _estadoAnterior: EstadoFormularioCrm,
  formData: FormData,
): Promise<EstadoFormularioCrm> {
  if (!clienteId) return { erro: "Cliente inválido." };

  const nomeComprador = String(formData.get("nome_comprador") ?? "").trim() || null;
  const segmento = String(formData.get("segmento") ?? "").trim() || null;
  const proximaAcao = String(formData.get("proxima_acao") ?? "").trim() || null;
  const proximaAcaoDataBruta = String(formData.get("proxima_acao_data") ?? "").trim();
  const proximaAcaoData = proximaAcaoDataBruta || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const valorPotencialBruto = String(formData.get("valor_potencial") ?? "").trim();
  let valorPotencial: number | null = null;
  if (valorPotencialBruto) {
    valorPotencial = Number(valorPotencialBruto);
    if (Number.isNaN(valorPotencial)) return { erro: "Valor potencial inválido." };
  }

  const supabase = await criarClienteSupabaseServidor();

  // Confirma que o cliente existe antes de gravar — nunca confia num id
  // vindo só da URL/formulário do client.
  const { data: cliente } = await supabase.from("clientes").select("id").eq("id", clienteId).maybeSingle<{ id: string }>();
  if (!cliente) return { erro: "Cliente não encontrado." };

  const { error } = await supabase.from("clientes_crm").upsert(
    {
      cliente_id: clienteId,
      nome_comprador: nomeComprador,
      segmento,
      proxima_acao: proximaAcao,
      proxima_acao_data: proximaAcaoData,
      valor_potencial: valorPotencial,
      observacoes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cliente_id" },
  );

  if (error) return { erro: `Erro ao salvar dados de CRM: ${error.message}` };

  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/clientes");
  revalidatePath("/admin");

  return { sucesso: true };
}
