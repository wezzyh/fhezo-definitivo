import Link from "next/link";
import { FormularioBanner } from "../formulario-banner";
import { criarBanner } from "../actions";

export default function NovoBannerPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Novo banner</h1>
        <Link href="/admin/conteudo/banners" className="text-sm font-medium text-brand-green hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-xl rounded-md border border-zinc-200 bg-white p-6">
        <FormularioBanner action={criarBanner} textoBotao="Publicar banner" />
      </div>
    </div>
  );
}
