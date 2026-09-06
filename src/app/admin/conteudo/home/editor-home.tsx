"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { SecaoHome, DadosHome } from "@/lib/conteudo/tipos";
import { publicarHome } from "./actions";

interface Opcao {
  id: string;
  nome: string;
}

interface ProdutoOpcao {
  id: string;
  nome: string;
  sku: string;
}

interface EditorHomeProps {
  secoesIniciais: SecaoHome[];
  categorias: Opcao[];
  produtos: ProdutoOpcao[];
}

function novaSecao(tipo: SecaoHome["tipo"], ordem: number): SecaoHome {
  const base = { id: crypto.randomUUID(), ordem, ativo: true };
  if (tipo === "categorias_destaque") {
    return { ...base, tipo, titulo: "Categorias em destaque", subtitulo: "", categoria_ids: [] };
  }
  return {
    ...base,
    tipo: "produtos_destaque",
    titulo: "Produtos em destaque",
    subtitulo: "",
    modo: "automatico",
    produto_ids: [],
    categoria_id: null,
    limite: 4,
  };
}

const ROTULOS_TIPO: Record<SecaoHome["tipo"], string> = {
  categorias_destaque: "Categorias em destaque",
  produtos_destaque: "Produtos em destaque",
};

export function EditorHome({ secoesIniciais, categorias, produtos }: EditorHomeProps) {
  const [secoes, setSecoes] = useState<SecaoHome[]>(secoesIniciais);
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function atualizar(id: string, alteracoes: Partial<SecaoHome>) {
    setSecoes((atual) => atual.map((secao) => (secao.id === id ? ({ ...secao, ...alteracoes } as SecaoHome) : secao)));
  }

  function remover(id: string) {
    setSecoes((atual) => atual.filter((secao) => secao.id !== id));
  }

  function mover(id: string, direcao: -1 | 1) {
    setSecoes((atual) => {
      const indice = atual.findIndex((secao) => secao.id === id);
      const novoIndice = indice + direcao;
      if (indice < 0 || novoIndice < 0 || novoIndice >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[novoIndice]] = [copia[novoIndice], copia[indice]];
      return copia.map((secao, i) => ({ ...secao, ordem: i + 1 }));
    });
  }

  function adicionar(tipo: SecaoHome["tipo"]) {
    setSecoes((atual) => [...atual, novaSecao(tipo, atual.length + 1)]);
  }

  function publicar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      const dados: DadosHome = { secoes };
      const resultado = await publicarHome(dados);
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
      {secoes.map((secao, indice) => (
        <div key={secao.id} className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--admin-text-secondary)]">{ROTULOS_TIPO[secao.tipo]}</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-[var(--admin-text-secondary)]">
                <input
                  type="checkbox"
                  checked={secao.ativo}
                  onChange={(e) => atualizar(secao.id, { ativo: e.target.checked })}
                />
                Ativa
              </label>
              <button
                type="button"
                onClick={() => mover(secao.id, -1)}
                disabled={indice === 0}
                className="px-1 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => mover(secao.id, 1)}
                disabled={indice === secoes.length - 1}
                className="px-1 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => remover(secao.id)}
                className="text-xs font-medium text-[var(--admin-danger)] hover:underline"
              >
                Remover
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {secao.tipo === "categorias_destaque" && (
              <>
                <Input
                  value={secao.titulo}
                  onChange={(e) => atualizar(secao.id, { titulo: e.target.value })}
                  placeholder="Título da seção"
                />
                <Input
                  value={secao.subtitulo}
                  onChange={(e) => atualizar(secao.id, { subtitulo: e.target.value })}
                  placeholder="Subtítulo (opcional)"
                />
                <Select
                  multiple
                  value={secao.categoria_ids}
                  onChange={(e) =>
                    atualizar(secao.id, { categoria_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })
                  }
                  className="h-32"
                >
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-[var(--admin-text-secondary)]">Segure Ctrl (ou Cmd) para selecionar mais de uma categoria.</p>
              </>
            )}

            {secao.tipo === "produtos_destaque" && (
              <>
                <Input
                  value={secao.titulo}
                  onChange={(e) => atualizar(secao.id, { titulo: e.target.value })}
                  placeholder="Título da seção"
                />
                <Input
                  value={secao.subtitulo}
                  onChange={(e) => atualizar(secao.id, { subtitulo: e.target.value })}
                  placeholder="Subtítulo (opcional)"
                />
                <Select
                  value={secao.modo}
                  onChange={(e) => atualizar(secao.id, { modo: e.target.value as "manual" | "automatico" })}
                >
                  <option value="automatico">Automático (mais recentes, opcionalmente por categoria)</option>
                  <option value="manual">Manual (escolher produtos)</option>
                </Select>

                {secao.modo === "automatico" && (
                  <div className="flex gap-3">
                    <Select
                      value={secao.categoria_id ?? ""}
                      onChange={(e) => atualizar(secao.id, { categoria_id: e.target.value || null })}
                    >
                      <option value="">Todas as categorias</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={secao.limite}
                      onChange={(e) => atualizar(secao.id, { limite: Number(e.target.value) || 1 })}
                      className="w-24"
                    />
                  </div>
                )}

                {secao.modo === "manual" && (
                  <>
                    <Select
                      multiple
                      value={secao.produto_ids}
                      onChange={(e) =>
                        atualizar(secao.id, { produto_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })
                      }
                      className="h-32"
                    >
                      {produtos.map((produto) => (
                        <option key={produto.id} value={produto.id}>
                          {produto.sku} — {produto.nome}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-[var(--admin-text-secondary)]">Segure Ctrl (ou Cmd) para selecionar mais de um produto.</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => adicionar("categorias_destaque")}>
          + Categorias em destaque
        </Button>
        <Button type="button" variant="outline" onClick={() => adicionar("produtos_destaque")}>
          + Produtos em destaque
        </Button>
      </div>

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
