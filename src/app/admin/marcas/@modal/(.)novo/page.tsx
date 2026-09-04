import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioMarca } from "../../formulario-marca";
import { criarMarca } from "../../actions";

export default function NovaMarcaModal() {
  return (
    <ModalDeRota titulo="Nova marca" tamanho="sm">
      <FormularioMarca action={criarMarca} textoBotao="Criar marca" />
    </ModalDeRota>
  );
}
