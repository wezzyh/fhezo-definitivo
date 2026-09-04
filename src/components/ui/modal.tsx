"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./button";

// createPortal precisa de `document`, que não existe durante SSR. Modais
// só montam via navegação/interação no cliente (nunca fazem parte do HTML
// gerado no servidor), mas o hook ainda evita qualquer flash: no cliente,
// useSyncExternalStore já devolve `true` na primeira renderização.
function semInscricao() {
  return () => {};
}
function useMontadoNoCliente(): boolean {
  return useSyncExternalStore(
    semInscricao,
    () => true,
    () => false,
  );
}

// Modal próprio (sem biblioteca) — hoje só usado dentro do /admin, então
// pode referenciar os tokens --admin-* diretamente (sem o fallback
// var(--admin-x, --color-y) que Button/Card/Input precisam, porque esses
// SIM aparecem no site público). Ver ADMIN_REDESIGN.md na raiz para a
// justificativa completa de não usar Radix/Headless UI aqui.

interface ModalProps {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  /** true quando o formulário dentro tem alterações não salvas — pede confirmação antes de fechar (Esc, clique fora ou botão de fechar). */
  temAlteracoesNaoSalvas?: boolean;
  tamanho?: "sm" | "md" | "lg";
  children: ReactNode;
}

const LARGURA_POR_TAMANHO: Record<"sm" | "md" | "lg", string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export function Modal({
  aberto,
  titulo,
  descricao,
  onFechar,
  temAlteracoesNaoSalvas = false,
  tamanho = "md",
  children,
}: ModalProps) {
  const montadoNoCliente = useMontadoNoCliente();
  const [pedindoConfirmacao, setPedindoConfirmacao] = useState(false);

  // Reseta "pedindoConfirmacao" quando o modal fecha (aberto passa a
  // false) — feito durante a renderização (comparando com o valor
  // anterior via ref-like state), não num efeito, seguindo a recomendação
  // do React para "ajustar estado quando uma prop muda" sem duplo render.
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);
  if (aberto !== abertoAnterior) {
    setAbertoAnterior(aberto);
    if (!aberto) setPedindoConfirmacao(false);
  }

  useEffect(() => {
    if (!aberto) return;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") tentarFechar();
    }
    window.addEventListener("keydown", aoPressionarTecla);
    return () => window.removeEventListener("keydown", aoPressionarTecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, temAlteracoesNaoSalvas]);

  function tentarFechar() {
    if (temAlteracoesNaoSalvas) {
      setPedindoConfirmacao(true);
      return;
    }
    onFechar();
  }

  if (!montadoNoCliente || !aberto) return null;

  // Porta pra dentro de #admin-modal-root (ver admin-shell.tsx), NUNCA
  // document.body direto: um portal escapa da árvore DOM (não só da
  // árvore React), e document.body fica FORA da div com
  // data-admin-theme — nenhuma variável --admin-* chegaria aqui.
  const alvoDoPortal = document.getElementById("admin-modal-root") ?? document.body;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 [animation:admin-fade-in_150ms_ease-out]"
        onClick={tentarFechar}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`relative w-full ${LARGURA_POR_TAMANHO[tamanho]} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] [animation:admin-modal-in_180ms_ease-out]`}
        style={{ boxShadow: "var(--admin-shadow)" }}
      >
        {pedindoConfirmacao ? (
          <div className="p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">Descartar alterações?</h2>
            <p className="mt-2 text-sm text-[var(--admin-text-secondary)]">
              Existem alterações não salvas neste formulário. Se fechar agora, elas serão perdidas.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setPedindoConfirmacao(false)}>
                Continuar editando
              </Button>
              <Button variant="danger" size="sm" type="button" onClick={onFechar}>
                Descartar alterações
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border)] px-6 py-4">
              <div className="min-w-0">
                <h2 id="modal-titulo" className="text-base font-semibold text-[var(--admin-text)]">
                  {titulo}
                </h2>
                {descricao && <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{descricao}</p>}
              </div>
              <button
                type="button"
                onClick={tentarFechar}
                aria-label="Fechar"
                className="shrink-0 rounded-md p-1 text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </>
        )}
      </div>
    </div>,
    alvoDoPortal,
  );
}
