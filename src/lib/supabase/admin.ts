import { createClient } from "@supabase/supabase-js";

// Cliente Supabase com a chave "service_role", que ignora as políticas de
// RLS. Uso restrito a código de servidor confiável — NUNCA em Client
// Components nem exposto ao navegador.
//
// Hoje usado apenas para ler/renovar o token do Melhor Envio durante o
// cálculo de frete no checkout público (src/lib/frete/melhorenvio.ts): a
// tabela "integracoes" só permite leitura/escrita para o admin autenticado
// via RLS, mas quem está finalizando uma compra é um visitante sem sessão
// de admin — por isso esse acesso precisa ignorar a RLS.
export function criarClienteSupabaseAdmin() {
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chaveServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!chaveServiceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está configurada no ambiente.");
  }

  return createClient(urlSupabase, chaveServiceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
