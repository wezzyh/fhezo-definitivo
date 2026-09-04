"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ResultadoPublicacao } from "@/lib/conteudo/tipos";

interface VersaoResumo {
  versao: number;
  publicado: boolean;
  created_at: string;
}

interface HistoricoConteudoProps {
  versoes: VersaoResumo[];
  onRestaurar: (versao: number) => Promise<ResultadoPublicacao>;
  /** true para telas dedicadas de histórico (ex.: histórico de um banner); false (padrão) quando é um "Ver histórico" secundário dentro de uma tela de edição. */
  abertoPorPadrao?: boolean;
}

// Lista de versões de um conteúdo (menu, home, tema ou um banner
// específico) com "Restaurar esta versão" — restaurar NUNCA apaga
// histórico: cria uma versão nova com o conteúdo copiado da antiga (ver
// publicar_conteudo_site/publicar_banner na migration 0012).
export function HistoricoConteudo({ versoes, onRestaurar, abertoPorPadrao = false }: HistoricoConteudoProps) {
  const [aberto, setAberto] = useState(abertoPorPadrao);
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  function restaurar(versao: number) {
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await onRestaurar(versao);
      if (resultado.sucesso) {
        setMensagem(`Versão ${versao} restaurada como nova versão ${resultado.versao}.`);
        router.refresh();
      } else {
        setMensagem(resultado.erro);
      }
    });
  }

  return (
    <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
      >
        {aberto ? "Ocultar histórico" : "Ver histórico"}
      </button>

      {aberto && (
        <div className="mt-3 space-y-2">
          {versoes.length === 0 && (
            <p className="text-sm text-[var(--admin-text-secondary)]">Nenhuma versão registrada ainda.</p>
          )}
          {versoes.map((versao) => (
            <div
              key={versao.versao}
              className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2 text-sm"
            >
              <span className="font-medium text-[var(--admin-text)]">Versão {versao.versao}</span>
              {versao.publicado && (
                <span className="rounded-full bg-[var(--admin-green)]/15 px-2 py-0.5 text-xs font-medium text-[var(--admin-green-text)]">
                  Publicada
                </span>
              )}
              <span className="text-[var(--admin-text-secondary)]">
                {new Date(versao.created_at).toLocaleString("pt-BR")}
              </span>
              {!versao.publicado && (
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto"
                  disabled={pendente}
                  onClick={() => restaurar(versao.versao)}
                >
                  Restaurar esta versão
                </Button>
              )}
            </div>
          ))}
          {mensagem && <p className="text-sm text-[var(--admin-text-secondary)]">{mensagem}</p>}
        </div>
      )}
    </div>
  );
}
