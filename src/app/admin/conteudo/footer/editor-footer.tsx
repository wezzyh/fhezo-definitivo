"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadImagem } from "@/components/admin/upload-imagem";
import type { DadosFooter, ImagemFooter } from "@/lib/conteudo/tipos";
import { publicarFooter } from "./actions";

interface EditorFooterProps {
  dadosIniciais: DadosFooter;
}

function itemVazio(ordem: number): ImagemFooter {
  return { id: crypto.randomUUID(), imagem_url: "", alt: "", ordem };
}

export function EditorFooter({ dadosIniciais }: EditorFooterProps) {
  const [formasPagamento, setFormasPagamento] = useState<ImagemFooter[]>(dadosIniciais.formas_pagamento);
  const [selosSeguranca, setSelosSeguranca] = useState<ImagemFooter[]>(dadosIniciais.selos_seguranca);
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function publicar() {
    setErro(null);
    setMensagem(null);

    const semImagem = [...formasPagamento, ...selosSeguranca].find((item) => !item.imagem_url);
    if (semImagem) {
      setErro("Envie a imagem de cada item antes de publicar (ou remova o item vazio).");
      return;
    }

    iniciarTransicao(async () => {
      const dados: DadosFooter = { formas_pagamento: formasPagamento, selos_seguranca: selosSeguranca };
      const resultado = await publicarFooter(dados);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(`Publicado como versão ${resultado.versao}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <ListaImagens
        titulo="Formas de pagamento"
        descricao='Ícones exibidos na faixa "Formas de pagamento" do rodapé (ex.: Visa, Mastercard, Pix, Boleto).'
        pasta="footer-pagamentos"
        itens={formasPagamento}
        onAlterar={setFormasPagamento}
      />

      <ListaImagens
        titulo="Selos de segurança"
        descricao='Selos exibidos na faixa "Compra segura" do rodapé (ex.: SSL, Google Safe Browsing).'
        pasta="footer-selos"
        itens={selosSeguranca}
        onAlterar={setSelosSeguranca}
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

interface ListaImagensProps {
  titulo: string;
  descricao: string;
  pasta: "footer-pagamentos" | "footer-selos";
  itens: ImagemFooter[];
  onAlterar: (itens: ImagemFooter[]) => void;
}

// Lista com upload + legenda por item — sem formulário nativo (o publicar
// já manda o array inteiro pra Server Action via publicarFooter, não por
// FormData), por isso cada UploadImagem aqui é controlado pelo prop
// onChange (o campo oculto que ele também renderiza, pensado pra <form
// action>, fica só como bagagem inofensiva e não usada neste fluxo).
function ListaImagens({ titulo, descricao, pasta, itens, onAlterar }: ListaImagensProps) {
  function adicionar() {
    onAlterar([...itens, itemVazio(itens.length + 1)]);
  }

  function remover(id: string) {
    onAlterar(itens.filter((item) => item.id !== id));
  }

  function atualizar(id: string, alteracoes: Partial<ImagemFooter>) {
    onAlterar(itens.map((item) => (item.id === id ? { ...item, ...alteracoes } : item)));
  }

  function mover(indice: number, direcao: -1 | 1) {
    const novoIndice = indice + direcao;
    if (novoIndice < 0 || novoIndice >= itens.length) return;
    const copia = [...itens];
    [copia[indice], copia[novoIndice]] = [copia[novoIndice], copia[indice]];
    onAlterar(copia.map((item, i) => ({ ...item, ordem: i + 1 })));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--admin-text)]">{titulo}</h2>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{descricao}</p>

      {itens.length === 0 && (
        <p className="mt-3 text-sm text-[var(--admin-text-secondary)]">
          Nenhum item cadastrado ainda — a faixa correspondente não aparece no site até adicionar o primeiro.
        </p>
      )}

      <div className="mt-4 flex max-w-md flex-col gap-2">
        {itens.map((item, indice) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2"
          >
            <UploadImagem
              compacto
              name={`imagem_${item.id}`}
              valorInicial={item.imagem_url || null}
              pasta={pasta}
              label="Imagem"
              onChange={(url) => atualizar(item.id, { imagem_url: url ?? "" })}
            />

            <Input
              value={item.alt}
              onChange={(e) => atualizar(item.id, { alt: e.target.value })}
              placeholder="Legenda (ex.: Visa)"
              className="h-9 flex-1"
            />

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => mover(indice, -1)}
                disabled={indice === 0}
                className="px-1 text-sm text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => mover(indice, 1)}
                disabled={indice === itens.length - 1}
                className="px-1 text-sm text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => remover(item.id)}
                className="ml-1 text-xs font-medium text-[var(--admin-danger)] hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="mt-3" onClick={adicionar}>
        + Adicionar item
      </Button>
    </div>
  );
}
