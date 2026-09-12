import "server-only";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
type Resposta = { sucesso: boolean; bloqueado?: boolean; mensagem?: string };
const pendente = {
  sucesso: false as const,
  bloqueado: true,
  mensagem:
    "Esta tentativa já está sendo processada ou precisa de conferência. Não inicie outra compra. Tente consultar esta mesma tentativa novamente.",
};
export async function executarUmaVez<T extends Resposta>(
  id: string,
  executar: () => Promise<T>,
): Promise<T | typeof pendente> {
  const banco = criarClienteSupabaseAdmin();
  const { error } = await banco.from("checkout_tentativas").insert({ id });
  if (error) {
    if (error.code !== "23505")
      return {
        sucesso: false,
        bloqueado: true,
        mensagem:
          "A finalização está indisponível. A loja precisa configurar o registro seguro das tentativas de pagamento.",
      };
    const { data } = await banco
      .from("checkout_tentativas")
      .select("estado,resultado")
      .eq("id", id)
      .maybeSingle<{ estado: string; resultado: T | null }>();
    return data?.resultado ?? pendente;
  }
  let resultado: T;
  try {
    resultado = await executar();
  } catch {
    // Não sabemos se a cobrança foi criada: mantém a trava para conciliação.
    await banco
      .from("checkout_tentativas")
      .update({ estado: "revisao" })
      .eq("id", id);
    return pendente;
  }
  if (!resultado.sucesso && !resultado.bloqueado) {
    // Só uma falha conhecida ANTES da cobrança (ou recusa explícita) permite retry.
    await banco.from("checkout_tentativas").delete().eq("id", id);
  } else {
    await banco
      .from("checkout_tentativas")
      .update({
        estado: resultado.sucesso ? "concluido" : "revisao",
        resultado,
      })
      .eq("id", id);
  }
  return resultado;
}
