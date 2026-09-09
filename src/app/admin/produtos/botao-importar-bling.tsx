"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importarDetalheBlingAction } from "./actions";

// Busca descrição/galeria/marca/EAN/NCM/peso completos no Bling e preenche
// só o que estiver vazio no produto local (nunca sobrescreve edição
// manual) — corrige produtos que foram criados pela sincronização de
// estoque antes dela buscar esses dados. Só aparece quando o produto tem
// bling_produto_id (veio do Bling / já foi vinculado).
export function BotaoImportarBling({ produtoId }: { produtoId: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function importar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await importarDetalheBlingAction(produtoId);
      if (!resultado.sucesso) {
        setErro(resultado.mensagem ?? "Erro ao importar do Bling.");
        return;
      }
      setMensagem(
        resultado.camposPreenchidos.length > 0
          ? `Importado: ${resultado.camposPreenchidos.join(", ")}.`
          : "Nada novo pra importar — os campos já estavam preenchidos.",
      );
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--admin-text)]">Importar do Bling</p>
          <p className="text-xs text-[var(--admin-text-secondary)]">
            Busca descrição, galeria de fotos, marca, EAN, NCM e peso no Bling — só preenche o que estiver
            vazio aqui, nunca sobrescreve o que você já editou.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={importar} disabled={pendente}>
          {pendente ? "Importando..." : "Importar do Bling"}
        </Button>
      </div>
      {mensagem && <p className="mt-2 text-sm text-[var(--admin-green-text)]">{mensagem}</p>}
      {erro && <p className="mt-2 text-sm text-[var(--admin-danger)]">{erro}</p>}
    </div>
  );
}
