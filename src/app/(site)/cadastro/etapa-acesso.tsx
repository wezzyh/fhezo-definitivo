"use client";

import { useState } from "react";
import { useWatch } from "react-hook-form";
import type { ValoresFormularioCadastro } from "@/lib/clientes/cadastro/esquemas";
import { ROTULOS_FORCA_SENHA, SENHA_MIN, avaliarForcaSenha, type NivelForcaSenha } from "@/lib/clientes/cadastro/senha";
import { CampoTexto, GrupoRadio } from "./campos";

const COR_POR_NIVEL: Record<NivelForcaSenha, string> = {
  0: "bg-zinc-200",
  1: "bg-red-500",
  2: "bg-warning",
  3: "bg-brand-green/70",
  4: "bg-brand-green",
};

function ForcaSenha({ nivel }: { nivel: NivelForcaSenha }) {
  return (
    <div>
      <div className="mt-1 flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segmento) => (
          <span
            key={segmento}
            className={`h-1.5 flex-1 rounded-full ${segmento <= nivel ? COR_POR_NIVEL[nivel] : "bg-zinc-200"}`}
          />
        ))}
      </div>
      <p className="mt-1">
        {nivel > 0 && (
          <>
            Força da senha: <strong className="text-ink">{ROTULOS_FORCA_SENHA[nivel]}</strong>.{" "}
          </>
        )}
        Mínimo de {SENHA_MIN} caracteres. Evite sequências (12345678) e senhas comuns.
      </p>
    </div>
  );
}

export function EtapaAcesso() {
  const senha = useWatch<ValoresFormularioCadastro, "acesso.senha">({ name: "acesso.senha" });
  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  return (
    <div className="space-y-5">
      <GrupoRadio
        nome="tipo"
        legenda="Tipo de conta"
        opcoes={[
          { valor: "PF", rotulo: "Pessoa física", descricao: "Compras no seu CPF." },
          { valor: "PJ", rotulo: "Pessoa jurídica", descricao: "Compras para empresa, com CNPJ." },
        ]}
      />

      <CampoTexto
        nome="acesso.email"
        rotulo="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />

      <CampoTexto
        nome="acesso.senha"
        rotulo="Senha"
        type={mostrarSenhas ? "text" : "password"}
        autoComplete="new-password"
        dica={<ForcaSenha nivel={avaliarForcaSenha(senha ?? "")} />}
      />

      <CampoTexto
        nome="acesso.confirmacaoSenha"
        rotulo="Confirme a senha"
        type={mostrarSenhas ? "text" : "password"}
        autoComplete="new-password"
      />

      <button
        type="button"
        aria-pressed={mostrarSenhas}
        onClick={() => setMostrarSenhas((valor) => !valor)}
        className="min-h-11 text-sm font-medium text-brand-green hover:underline"
      >
        {mostrarSenhas ? "Ocultar senhas" : "Mostrar senhas"}
      </button>
    </div>
  );
}
