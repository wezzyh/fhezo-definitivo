"use client";

import { useState, useTransition } from "react";
import { UploadImagem } from "@/components/admin/upload-imagem";
import { adicionarImagemGaleria, removerImagemGaleria, moverImagemGaleria } from "./galeria-actions";
import type { ProdutoImagem } from "@/types/database";

interface GaleriaProdutoAdminProps {
  produtoId: string;
  imagensIniciais: ProdutoImagem[];
}

// Fotos adicionais do produto (além da "Imagem principal" acima, que
// continua sendo produtos.imagem_url) — cada ação grava na hora (ver
// galeria-actions.ts), então não faz parte do FormData do formulário
// grande nem depende do botão "Salvar produto".
export function GaleriaProdutoAdmin({ produtoId, imagensIniciais }: GaleriaProdutoAdminProps) {
  const [imagens, setImagens] = useState<ProdutoImagem[]>(imagensIniciais);
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  // Muda a cada foto adicionada com sucesso, forçando o UploadImagem
  // compacto a remontar do zero — sem isso ele ficaria mostrando a última
  // foto enviada como se fosse permanente, em vez de voltar a ser um slot
  // vazio pronto pra próxima.
  const [chaveUpload, setChaveUpload] = useState(0);

  function adicionar(url: string | null) {
    if (!url) return;
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await adicionarImagemGaleria(produtoId, url);
      if (!resultado.sucesso) {
        setErro(resultado.erro ?? "Erro ao adicionar imagem.");
        return;
      }
      setImagens((atual) => [
        ...atual,
        { id: crypto.randomUUID(), produto_id: produtoId, url, posicao: atual.length, capa: false, created_at: "" },
      ]);
      setChaveUpload((atual) => atual + 1);
    });
  }

  function remover(id: string) {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await removerImagemGaleria(id);
      if (!resultado.sucesso) {
        setErro(resultado.erro ?? "Erro ao remover imagem.");
        return;
      }
      setImagens((atual) => atual.filter((imagem) => imagem.id !== id));
    });
  }

  function mover(indice: number, direcao: -1 | 1) {
    const novoIndice = indice + direcao;
    if (novoIndice < 0 || novoIndice >= imagens.length) return;
    const imagem = imagens[indice];

    setErro(null);
    const copia = [...imagens];
    [copia[indice], copia[novoIndice]] = [copia[novoIndice], copia[indice]];
    setImagens(copia);

    iniciarTransicao(async () => {
      const resultado = await moverImagemGaleria(produtoId, imagem.id, direcao);
      if (!resultado.sucesso) setErro(resultado.erro ?? "Erro ao reordenar.");
    });
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
        Galeria (fotos adicionais)
      </label>
      <p className="mb-2 text-xs text-[var(--admin-text-secondary)]">
        Além da imagem principal acima — aparecem como miniaturas na página do produto.
      </p>

      <div className="flex flex-wrap items-start gap-2">
        {imagens.map((imagem, indice) => (
          <div key={imagem.id} className="flex flex-col items-center gap-1">
            <div className="relative h-14 w-14 overflow-hidden rounded-md border border-[var(--admin-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL do Storage cadastrada pelo admin. */}
              <img src={imagem.url} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => mover(indice, -1)}
                disabled={indice === 0 || pendente}
                className="px-0.5 text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => remover(imagem.id)}
                disabled={pendente}
                className="px-0.5 text-xs font-medium text-[var(--admin-danger)] hover:underline disabled:opacity-30"
              >
                remover
              </button>
              <button
                type="button"
                onClick={() => mover(indice, 1)}
                disabled={indice === imagens.length - 1 || pendente}
                className="px-0.5 text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
              >
                ▶
              </button>
            </div>
          </div>
        ))}

        <UploadImagem
          key={chaveUpload}
          compacto
          name="galeria_nova_imagem"
          valorInicial={null}
          pasta="produtos"
          label="Adicionar foto à galeria"
          onChange={adicionar}
        />
      </div>

      {erro && <p className="mt-1 text-xs text-[var(--admin-danger)]">{erro}</p>}
    </div>
  );
}
