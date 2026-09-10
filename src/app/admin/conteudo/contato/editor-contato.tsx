"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DadosContato, RedesSociais } from "@/lib/conteudo/tipos";
import { publicarContato } from "./actions";

export function EditorContato({ dadosIniciais }: { dadosIniciais: DadosContato }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [pendente, iniciarTransicao] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function atualizar(alteracoes: Partial<DadosContato>) {
    setDados((atual) => ({ ...atual, ...alteracoes }));
  }

  function atualizarRedeSocial(rede: keyof RedesSociais, valor: string) {
    setDados((atual) => ({
      ...atual,
      redesSociais: { ...atual.redesSociais, [rede]: valor.trim() || null },
    }));
  }

  function publicar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      const resultado = await publicarContato(dados);
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
      <div className="rounded-md border border-[var(--admin-border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">Telefone e WhatsApp</h2>
        <p className="mt-0.5 text-xs text-[var(--admin-text-secondary)]">
          Digite o número normalmente (ex.: (51) 99351-56006) — os links de ligar/chamar no WhatsApp são gerados
          automaticamente a partir disso.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Telefone</label>
            <Input
              value={dados.telefone}
              onChange={(e) => atualizar({ telefone: e.target.value })}
              placeholder="(51) 99351-56006"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">WhatsApp</label>
            <Input
              value={dados.whatsapp}
              onChange={(e) => atualizar({ whatsapp: e.target.value })}
              placeholder="(51) 99351-56006"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[var(--admin-border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">E-mail e endereço</h2>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">E-mail</label>
            <Input type="email" value={dados.email} onChange={(e) => atualizar({ email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Endereço</label>
            <Input value={dados.endereco} onChange={(e) => atualizar({ endereco: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Dias de atendimento</label>
              <Input value={dados.horarioDias} onChange={(e) => atualizar({ horarioDias: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Horário</label>
              <Input value={dados.horarioHoras} onChange={(e) => atualizar({ horarioHoras: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[var(--admin-border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">Redes sociais</h2>
        <p className="mt-0.5 text-xs text-[var(--admin-text-secondary)]">
          Cole o link completo do perfil. Deixe em branco para não mostrar o ícone no site.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Instagram</label>
            <Input
              type="url"
              value={dados.redesSociais.instagram ?? ""}
              onChange={(e) => atualizarRedeSocial("instagram", e.target.value)}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Facebook</label>
            <Input
              type="url"
              value={dados.redesSociais.facebook ?? ""}
              onChange={(e) => atualizarRedeSocial("facebook", e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">YouTube</label>
            <Input
              type="url"
              value={dados.redesSociais.youtube ?? ""}
              onChange={(e) => atualizarRedeSocial("youtube", e.target.value)}
              placeholder="https://youtube.com/@..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--admin-text)]">TikTok</label>
            <Input
              type="url"
              value={dados.redesSociais.tiktok ?? ""}
              onChange={(e) => atualizarRedeSocial("tiktok", e.target.value)}
              placeholder="https://tiktok.com/@..."
            />
          </div>
        </div>
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
