"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";

const ContextoFecharModalDeRota = createContext<(() => void) | null>(null);

/**
 * Formulários dentro de um ModalDeRota usam isso pra oferecer um botão
 * "Cancelar" próprio (ao lado do de salvar) sem precisar de nenhuma prop
 * nova de "modo modal" — clicar em Cancelar fecha exatamente como o X/Esc/
 * clique fora fecham (router.back(), voltando pra rota de baixo).
 * Diferente de X/Esc/backdrop, Cancelar não pede confirmação de
 * alterações não salvas: é uma escolha explícita do usuário, não um clique
 * acidental.
 */
export function useFecharModalDeRota(): (() => void) | null {
  return useContext(ContextoFecharModalDeRota);
}

// Wrapper genérico para as rotas interceptadas (@modal/(.)novo,
// @modal/(.)[id]/editar) de produtos/marcas/categorias/tickets — ver
// ADMIN_REDESIGN.md para a explicação completa da arquitetura.
//
// Por que rota interceptada em vez de estado de cliente na listagem: os
// Server Actions de criar/atualizar (criarProduto, atualizarMarca etc.)
// terminam com `redirect(...)` para a listagem em caso de sucesso — e
// essa lógica NÃO pode ser tocada nesta tarefa. Uma rota interceptada
// resolve isso de graça: o redirect (mesmo pra uma URL onde já "estamos",
// visualmente) faz o slot @modal parar de casar com a rota interceptada e
// voltar pro default.tsx (null) — o modal fecha sozinho exatamente quando
// a ação tem sucesso, sem precisar inspecionar o retorno da Server Action.
//
// "Sujo" (alterações não salvas) é detectado sem tocar nos formulários
// existentes: um <input>/<select>/<textarea> disparam "input"/"change" ao
// serem tocados, e React entrega esses eventos por bubbling até este
// wrapper — não precisa de nenhuma prop nova nos formulários em si.
interface ModalDeRotaProps {
  titulo: string;
  descricao?: string;
  tamanho?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function ModalDeRota({ titulo, descricao, tamanho = "lg", children }: ModalDeRotaProps) {
  const router = useRouter();
  const [sujo, setSujo] = useState(false);

  return (
    <Modal
      aberto
      titulo={titulo}
      descricao={descricao}
      tamanho={tamanho}
      temAlteracoesNaoSalvas={sujo}
      onFechar={() => router.back()}
    >
      <ContextoFecharModalDeRota.Provider value={() => router.back()}>
        <div onInput={() => setSujo(true)} onChange={() => setSujo(true)}>
          {children}
        </div>
      </ContextoFecharModalDeRota.Provider>
    </Modal>
  );
}
