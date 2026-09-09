"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DadosSeo, SeoPagina } from "@/lib/conteudo/tipos";
import { publicarSeo } from "./actions";

export function EditorSeo({ dadosIniciais }: { dadosIniciais: DadosSeo }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function atualizarPagina(chave: keyof DadosSeo, alteracoes: Partial<SeoPagina>) {
    setDados((atual) => ({ ...atual, [chave]: { ...atual[chave], ...alteracoes } }));
  }

  function publicar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await publicarSeo(dados);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(`Publicado como versão ${resultado.versao}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <BlocoSeo
        titulo="Home"
        descricao="Página inicial do site (/)."
        dados={dados.home}
        onAlterar={(alteracoes) => atualizarPagina("home", alteracoes)}
      />

      <BlocoSeo
        titulo="Listagem de produtos"
        descricao="Catálogo geral (/produtos)."
        dados={dados.produtos}
        onAlterar={(alteracoes) => atualizarPagina("produtos", alteracoes)}
      />

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

interface BlocoSeoProps {
  titulo: string;
  descricao: string;
  dados: SeoPagina;
  onAlterar: (alteracoes: Partial<SeoPagina>) => void;
}

function BlocoSeo({ titulo, descricao, dados, onAlterar }: BlocoSeoProps) {
  return (
    <div className="rounded-md border border-[var(--admin-border)] p-4">
      <h2 className="text-sm font-semibold text-[var(--admin-text)]">{titulo}</h2>
      <p className="mt-0.5 text-xs text-[var(--admin-text-secondary)]">{descricao}</p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Título para buscadores</label>
          <Input value={dados.titulo} onChange={(e) => onAlterar({ titulo: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
            Descrição para buscadores
          </label>
          <Textarea rows={2} value={dados.descricao} onChange={(e) => onAlterar({ descricao: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
