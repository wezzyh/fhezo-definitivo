"use client";

import { useRef, useState, type DragEvent } from "react";
import { converterImagemParaWebP } from "@/lib/imagens/converter-webp";
import { enviarImagemAdmin } from "./upload-imagem-actions";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

interface UploadImagemProps {
  /** Nome do campo no FormData do formulário — o valor final (URL pública) sai daqui, igual a um <Input> comum. Também é publicado um campo oculto "<name>_anterior" com a URL que existia ao carregar a tela, para a Server Action de salvar decidir se limpa a imagem antiga do Storage. */
  name: string;
  valorInicial: string | null;
  /** Pasta dentro do bucket "admin-imagens" (ver enviarImagemAdmin — a mesma lista de PASTAS_PERMITIDAS precisa ser mantida em sincronia). */
  pasta: "produtos" | "banners" | "footer-pagamentos" | "footer-selos";
  label: string;
  obrigatorio?: boolean;
  /** Opcional: além do campo oculto (para <form action>), notifica o valor final a cada upload/remoção bem-sucedidos — usado por editores que mantêm uma lista em estado React (ver editor-footer.tsx) em vez de um <form> nativo. */
  onChange?: (url: string | null) => void;
}

// Componente de upload de imagem reutilizado nos formulários de admin que
// hoje têm um campo de imagem (produtos, banners) — substitui o campo de
// texto "URL da imagem". Clique ou arrastar-e-soltar; converte para WebP
// no navegador (ver converter-webp.ts) antes de enviar, o que já reduz o
// tamanho do upload; sobe via Server Action (enviarImagemAdmin) para o
// Storage do Supabase; o valor final continua sendo uma URL de texto,
// exatamente o que a coluna no banco já esperava antes.
export function UploadImagem({ name, valorInicial, pasta, label, obrigatorio, onChange }: UploadImagemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(valorInicial);
  const [valorFinal, setValorFinal] = useState<string | null>(valorInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  async function processarArquivo(arquivo: File) {
    setErro(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Formato inválido. Envie um arquivo JPG, PNG ou WebP.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErro("A imagem excede o tamanho máximo de 5 MB.");
      return;
    }

    const previewLocal = URL.createObjectURL(arquivo);
    setPreview(previewLocal);
    setEnviando(true);

    try {
      let arquivoParaEnviar = arquivo;
      try {
        arquivoParaEnviar = await converterImagemParaWebP(arquivo);
      } catch {
        // Falha na conversão (ex.: canvas indisponível) não deve travar o
        // upload — segue com o arquivo original.
      }

      const formData = new FormData();
      formData.set("arquivo", arquivoParaEnviar);
      formData.set("pasta", pasta);

      const resultado = await enviarImagemAdmin(formData);

      if (!resultado.sucesso) {
        setErro(resultado.erro);
        setPreview(valorFinal);
        return;
      }

      setValorFinal(resultado.url);
      setPreview(resultado.url);
      onChange?.(resultado.url);
    } catch {
      setErro("Falha de rede ao enviar a imagem. Tente novamente.");
      setPreview(valorFinal);
    } finally {
      URL.revokeObjectURL(previewLocal);
      setEnviando(false);
    }
  }

  function lidarComSelecao(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (arquivo) void processarArquivo(arquivo);
  }

  function lidarComDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    const arquivo = event.dataTransfer.files?.[0];
    if (arquivo) void processarArquivo(arquivo);
  }

  function remover() {
    setValorFinal(null);
    setPreview(null);
    setErro(null);
    onChange?.(null);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
        {label} {obrigatorio && "*"}
      </label>

      <input type="hidden" name={name} value={valorFinal ?? ""} />
      <input type="hidden" name={`${name}_anterior`} value={valorInicial ?? ""} />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={lidarComDrop}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center transition-colors ${
          arrastando
            ? "border-[var(--admin-focus)] bg-[var(--admin-surface-hover)]"
            : "border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_ACEITOS.join(",")}
          className="hidden"
          onChange={lidarComSelecao}
        />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview de arquivo local (blob:) ou URL do Storage, sem domínio fixo para next/image.
          <img src={preview} alt="Pré-visualização da imagem" className="max-h-[160px] max-w-full object-contain" />
        ) : (
          <p className="text-sm text-[var(--admin-text-secondary)]">
            Clique ou arraste uma imagem aqui (JPG, PNG ou WebP, até 5 MB)
          </p>
        )}

        {enviando && <p className="text-xs font-medium text-[var(--admin-green-text)]">Enviando imagem...</p>}
      </div>

      {preview && !enviando && (
        <button
          type="button"
          onClick={remover}
          className="mt-2 text-xs font-medium text-[var(--admin-danger)] hover:underline"
        >
          Remover imagem
        </button>
      )}

      {erro && <p className="mt-1 text-xs text-[var(--admin-danger)]">{erro}</p>}
    </div>
  );
}
