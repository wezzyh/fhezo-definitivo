import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Cliente } from "@/types/database";

export interface ClienteLogado {
  userId: string;
  email: string;
  cliente: Cliente | null;
}

/**
 * Sessão de cliente do site público (Supabase Auth) — separada da sessão
 * de admin, mas usa o mesmo mecanismo (cookies via @supabase/ssr). `cliente`
 * vem null no raro caso de um usuário autenticado sem linha em "clientes"
 * (ex.: cadastro que falhou na etapa de criar o registro) — quem chama
 * decide como tratar esse caso.
 *
 * É a ÚNICA forma de saber quem é o cliente atual: auth.uid() →
 * clientes.auth_user_id. Não existe vínculo automático por e-mail nem por
 * CPF/CNPJ (APPSEC-003) — a antiga vincularClienteExistentePorEmail foi
 * removida porque o e-mail gravado numa compra sem conta nunca foi
 * verificado, e quem controlasse aquele endereço herdaria o histórico.
 */
export async function obterClienteLogado(): Promise<ClienteLogado | null> {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<Cliente>();

  return { userId: user.id, email: user.email, cliente: cliente ?? null };
}
