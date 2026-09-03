"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ItemMenu } from "@/lib/conteudo/tipos";
import { adicionarItem, removerItem, moverItem, atualizarItem } from "@/lib/conteudo/arvore-menu";
import { publicarMenu } from "./actions";

interface CategoriaOpcao {
  id: string;
  nome: string;
}

interface EditorMenuProps {
  itensIniciais: ItemMenu[];
  categorias: CategoriaOpcao[];
}

export function EditorMenu({ itensIniciais, categorias }: EditorMenuProps) {
  const [itens, setItens] = useState<ItemMenu[]>(itensIniciais);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  function publicar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await publicarMenu({ itens });
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
      <ArvoreItens
        itens={itens}
        caminho={[]}
        categorias={categorias}
        onRemover={(caminho) => setItens((atual) => removerItem(atual, caminho))}
        onMover={(caminho, direcao) => setItens((atual) => moverItem(atual, caminho, direcao))}
        onAtualizar={(caminho, alteracoes) => setItens((atual) => atualizarItem(atual, caminho, alteracoes))}
        onAdicionarFilho={(caminho) => setItens((atual) => adicionarItem(atual, caminho))}
      />

      <Button type="button" variant="outline" onClick={() => setItens((atual) => adicionarItem(atual, []))}>
        + Item de topo
      </Button>

      <div className="flex items-center gap-4 border-t border-zinc-200 pt-4">
        <Button type="button" variant="primary" onClick={publicar} disabled={pendente}>
          {pendente ? "Publicando..." : "Publicar"}
        </Button>
        {mensagem && <p className="text-sm text-brand-green-dark">{mensagem}</p>}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    </div>
  );
}

interface ArvoreItensProps {
  itens: ItemMenu[];
  caminho: number[];
  categorias: CategoriaOpcao[];
  onRemover: (caminho: number[]) => void;
  onMover: (caminho: number[], direcao: -1 | 1) => void;
  onAtualizar: (caminho: number[], alteracoes: Partial<ItemMenu>) => void;
  onAdicionarFilho: (caminho: number[]) => void;
}

function ArvoreItens({ itens, caminho, categorias, onRemover, onMover, onAtualizar, onAdicionarFilho }: ArvoreItensProps) {
  return (
    <ul className="space-y-3">
      {itens.map((item, indice) => {
        const caminhoItem = [...caminho, indice];
        return (
          <li
            key={item.id}
            className="rounded-md border border-zinc-200 bg-white p-3"
            style={{ marginLeft: caminho.length * 24 }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="max-w-xs"
                value={item.rotulo}
                onChange={(e) => onAtualizar(caminhoItem, { rotulo: e.target.value })}
                placeholder="Rótulo"
              />
              <Select
                className="max-w-[9rem]"
                value={item.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as ItemMenu["tipo"];
                  onAtualizar(
                    caminhoItem,
                    tipo === "categoria"
                      ? { tipo, href: null }
                      : { tipo, categoria_id: null, href: item.href ?? "/produtos" },
                  );
                }}
              >
                <option value="todos">Todos os produtos</option>
                <option value="categoria">Categoria</option>
                <option value="link">Link livre</option>
              </Select>

              {item.tipo === "categoria" && (
                <Select
                  className="max-w-[12rem]"
                  value={item.categoria_id ?? ""}
                  onChange={(e) => onAtualizar(caminhoItem, { categoria_id: e.target.value || null })}
                >
                  <option value="">Selecione a categoria...</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </Select>
              )}

              {item.tipo === "link" && (
                <Input
                  className="max-w-xs"
                  value={item.href ?? ""}
                  onChange={(e) => onAtualizar(caminhoItem, { href: e.target.value })}
                  placeholder="/institucional"
                />
              )}

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMover(caminhoItem, -1)}
                  disabled={indice === 0}
                  className="px-2 text-sm text-muted hover:text-ink disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onMover(caminhoItem, 1)}
                  disabled={indice === itens.length - 1}
                  className="px-2 text-sm text-muted hover:text-ink disabled:opacity-30"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => onAdicionarFilho(caminhoItem)}
                  className="px-2 text-sm font-medium text-brand-green hover:underline"
                >
                  + submenu
                </button>
                <button
                  type="button"
                  onClick={() => onRemover(caminhoItem)}
                  className="px-2 text-sm font-medium text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            </div>

            {item.filhos.length > 0 && (
              <div className="mt-3">
                <ArvoreItens
                  itens={item.filhos}
                  caminho={caminhoItem}
                  categorias={categorias}
                  onRemover={onRemover}
                  onMover={onMover}
                  onAtualizar={onAtualizar}
                  onAdicionarFilho={onAdicionarFilho}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
