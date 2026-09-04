"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DadosTema } from "@/lib/conteudo/tipos";
import { publicarTema } from "./actions";

const CAMPOS: { chave: keyof DadosTema["cores"]; rotulo: string; descricao: string }[] = [
  { chave: "brand_green", rotulo: "Verde da marca", descricao: "Ações, destaques, hover" },
  { chave: "brand_green_dark", rotulo: "Verde da marca (escuro)", descricao: "Hover/estado ativo do verde da marca" },
  { chave: "dark", rotulo: "Escuro", descricao: "Header, footer" },
  { chave: "dark_2", rotulo: "Escuro secundário", descricao: "Seções escuras secundárias" },
  { chave: "page", rotulo: "Fundo da página", descricao: "Fundo das páginas de conteúdo" },
  { chave: "ink", rotulo: "Texto principal", descricao: "Cor do texto principal" },
  { chave: "muted", rotulo: "Texto secundário", descricao: "Cor do texto secundário" },
  { chave: "warning", rotulo: "Alerta", descricao: "Uso pontual, nunca fundo grande" },
];

export function EditorTema({ coresIniciais }: { coresIniciais: DadosTema["cores"] }) {
  const [cores, setCores] = useState(coresIniciais);
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function publicar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await publicarTema({ cores });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(`Publicado como versão ${resultado.versao}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {CAMPOS.map((campo) => (
        <div key={campo.chave} className="flex items-center gap-3">
          <input
            type="color"
            value={cores[campo.chave]}
            onChange={(e) => setCores((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
            className="h-10 w-14 shrink-0 rounded border border-[var(--admin-border-strong)]"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--admin-text)]">{campo.rotulo}</p>
            <p className="text-xs text-[var(--admin-text-secondary)]">{campo.descricao}</p>
          </div>
          <input
            type="text"
            value={cores[campo.chave]}
            onChange={(e) => setCores((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
            className="w-28 rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-bg)] px-2 py-1 text-sm text-[var(--admin-text)]"
          />
        </div>
      ))}

      <div className="flex items-center gap-4 border-t border-[var(--admin-border)] pt-4">
        <Button type="button" variant="primary" onClick={publicar} disabled={pendente}>
          {pendente ? "Publicando..." : "Publicar"}
        </Button>
        {mensagem && <p className="text-sm text-[var(--admin-green-text)]">{mensagem}</p>}
        {erro && <p className="text-sm text-[var(--admin-danger)]">{erro}</p>}
      </div>
    </div>
  );
}
