"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { excluirProduto } from "./actions";

interface FormularioExcluirProdutoProps {
  id: string;
  className?: string;
}

export function FormularioExcluirProduto({ id, className = "" }: FormularioExcluirProdutoProps) {
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function confirmarExclusao() {
    setExcluindo(true);
    const formData = new FormData();
    formData.set("id", id);
    await excluirProduto(formData);
    setExcluindo(false);
    setAberto(false);

    // Chamado tanto da linha da tabela quanto de dentro do modal de
    // edição (rota interceptada /admin/produtos/[id]/editar). Nos dois
    // casos a Server Action já chamou revalidatePath("/admin/produtos"),
    // então:
    // - de dentro do modal, só falta SAIR da rota — router.push já basta
    //   pra mostrar a lista atualizada. Chamar router.refresh() logo
    //   depois (como este código fazia antes) tentava revalidar a rota
    //   [id]/editar que a Server Action acabou de esvaziar; a página real
    //   dessa rota reage com notFound() e isso derrubava o painel inteiro
    //   num 404 genérico.
    // - na linha da tabela não há navegação nenhuma, então continua
    //   precisando do refresh() pra puxar os dados novos.
    if (pathname.includes("/editar")) {
      router.push("/admin/produtos");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`text-[var(--admin-danger)] hover:underline ${className}`}
      >
        Excluir
      </button>

      <ConfirmDialog
        aberto={aberto}
        titulo="Excluir produto"
        descricao="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        textoConfirmar="Excluir produto"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setAberto(false)}
      />
    </>
  );
}
