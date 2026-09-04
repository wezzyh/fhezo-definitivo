"use client";

import { Button } from "./button";
import { Modal } from "./modal";

// Substitui window.confirm() nas ações destrutivas do admin (excluir
// produto, marca, etc.) por um modal consistente com o design system —
// reaproveita o Modal (header/backdrop/Esc já resolvidos ali).

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destrutivo?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  destrutivo = true,
  carregando = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onCancelar} tamanho="sm">
      {descricao && <p className="text-sm text-[var(--admin-text-secondary)]">{descricao}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={onCancelar} disabled={carregando}>
          {textoCancelar}
        </Button>
        <Button
          variant={destrutivo ? "danger" : "primary"}
          size="sm"
          type="button"
          onClick={onConfirmar}
          loading={carregando}
        >
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
