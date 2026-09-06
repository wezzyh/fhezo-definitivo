import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
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
 * ainda vinculada (ex.: cadastro que falhou na etapa de vincular/criar o
 * registro) — quem chama decide como tratar esse caso.
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

/**
 * Vincula automaticamente uma conta recém-autenticada (login ou cadastro)
 * a um registro de "clientes" já existente com o mesmo e-mail, mas ainda
 * sem conta (ex.: alguém que comprou como convidado antes de ter login).
 * Só vincula quando o e-mail bate com EXATAMENTE uma linha sem
 * auth_user_id — se houver mais de uma (ex.: duas compras avulsas com
 * documentos diferentes mas mesmo e-mail), não escolhe por conta própria e
 * não vincula nenhuma, para nunca misturar identidades por engano.
 * Roda com service_role porque a linha alvo ainda não tem auth_user_id =
 * auth.uid() — a política de RLS "Cliente edita os proprios dados" não
 * cobre esse primeiro vínculo.
 */
export async function vincularClienteExistentePorEmail(userId: string, email: string): Promise<void> {
  const supabaseAdmin = criarClienteSupabaseAdmin();

  const { data: candidatos } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("email", email)
    .is("auth_user_id", null)
    .returns<Pick<Cliente, "id">[]>();

  if (!candidatos || candidatos.length !== 1) return;

  await supabaseAdmin.from("clientes").update({ auth_user_id: userId }).eq("id", candidatos[0].id);
}
