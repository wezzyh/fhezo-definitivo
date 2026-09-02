"use client";

import { excluirProduto } from "./actions";

interface FormularioExcluirProdutoProps {
  id: string;
  className?: string;
}

export function FormularioExcluirProduto({ id, className = "" }: FormularioExcluirProdutoProps) {
  return (
    <form
      action={excluirProduto}
      onSubmit={(evento) => {
        if (
          !window.confirm(
            "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
          )
        ) {
          evento.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`text-red-600 hover:underline ${className}`}>
        Excluir
      </button>
    </form>
  );
}
