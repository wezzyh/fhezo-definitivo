"use client";

// Campos do assistente de cadastro, ligados ao react-hook-form do
// AssistenteCadastro via contexto. Cada campo já resolve: rótulo ligado ao
// input, erro associado por aria-describedby, aria-invalid, e alvo de toque
// de no mínimo 44px (min-h-11).

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { get, useController, useFormContext, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ValoresFormularioCadastro } from "@/lib/clientes/cadastro/esquemas";

export type NomeCampo = FieldPath<ValoresFormularioCadastro>;

export function idDoCampo(nome: string): string {
  return `cadastro-${nome.replace(/\./g, "-")}`;
}

function useErroDoCampo(nome: NomeCampo): string | undefined {
  const {
    formState: { errors },
  } = useFormContext<ValoresFormularioCadastro>();
  return (get(errors, nome) as { message?: string } | undefined)?.message;
}

function descritoPor(id: string, dica: ReactNode, erro: string | undefined): string | undefined {
  return [dica ? `${id}-dica` : null, erro ? `${id}-erro` : null].filter(Boolean).join(" ") || undefined;
}

function Rotulo({ htmlFor, rotulo, opcional }: { htmlFor: string; rotulo: ReactNode; opcional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
      {rotulo}
      {opcional && <span className="font-normal text-muted"> (opcional)</span>}
    </label>
  );
}

function Descricoes({ id, dica, erro, recuo }: { id: string; dica?: ReactNode; erro?: string; recuo?: boolean }) {
  return (
    <>
      {dica && (
        <div id={`${id}-dica`} className={`mt-1 text-xs text-muted ${recuo ? "pl-8" : ""}`}>
          {dica}
        </div>
      )}
      {erro && (
        <p id={`${id}-erro`} className={`mt-1 text-xs text-red-600 ${recuo ? "pl-8" : ""}`}>
          {erro}
        </p>
      )}
    </>
  );
}

const CLASSE_CAMPO =
  "min-h-11 read-only:cursor-not-allowed read-only:bg-zinc-100 read-only:text-muted aria-invalid:border-red-600 aria-invalid:focus:ring-red-600";

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "className"> {
  nome: NomeCampo;
  rotulo: ReactNode;
  opcional?: boolean;
  dica?: ReactNode;
  /** Formata enquanto digita (CPF, CEP, telefone...). */
  mascara?: (valor: string) => string;
  /** Classe do wrapper (ex.: colunas do grid), não do input. */
  className?: string;
}

export function CampoTexto({
  nome,
  rotulo,
  opcional,
  dica,
  mascara,
  className = "",
  onChange: aoMudarExtra,
  onBlur: aoSairExtra,
  ...props
}: CampoTextoProps) {
  const { register } = useFormContext<ValoresFormularioCadastro>();
  const erro = useErroDoCampo(nome);
  const id = idDoCampo(nome);
  const { onChange, onBlur, ...registro } = register(nome);

  return (
    <div className={className}>
      <Rotulo htmlFor={id} rotulo={rotulo} opcional={opcional} />
      <Input
        id={id}
        {...registro}
        {...props}
        className={CLASSE_CAMPO}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, dica, erro)}
        onChange={(evento) => {
          // A máscara precisa ser aplicada ANTES do react-hook-form ler o valor.
          if (mascara) evento.target.value = mascara(evento.target.value);
          void onChange(evento);
          aoMudarExtra?.(evento);
        }}
        onBlur={(evento) => {
          void onBlur(evento);
          aoSairExtra?.(evento);
        }}
      />
      <Descricoes id={id} dica={dica} erro={erro} />
    </div>
  );
}

interface CampoSelecaoProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id" | "className"> {
  nome: NomeCampo;
  rotulo: ReactNode;
  className?: string;
}

export function CampoSelecao({ nome, rotulo, className = "", children, ...props }: CampoSelecaoProps) {
  const { register } = useFormContext<ValoresFormularioCadastro>();
  const erro = useErroDoCampo(nome);
  const id = idDoCampo(nome);

  return (
    <div className={className}>
      <Rotulo htmlFor={id} rotulo={rotulo} />
      <Select
        id={id}
        {...register(nome)}
        {...props}
        className={CLASSE_CAMPO}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, null, erro)}
      >
        {children}
      </Select>
      <Descricoes id={id} erro={erro} />
    </div>
  );
}

interface CampoCaixaProps {
  nome: NomeCampo;
  rotulo: ReactNode;
  dica?: ReactNode;
  /** Trava o checkbox no valor atual (quem define o valor é outra regra). */
  travado?: boolean;
  aoMudar?: (marcado: boolean) => void;
}

/**
 * Checkbox via useController, e não register: com register, um input
 * `disabled` faz o react-hook-form tratar o valor como undefined — e o
 * "Isento" travado pela regra de ICMS precisa continuar valendo true/false.
 */
export function CampoCaixa({ nome, rotulo, dica, travado, aoMudar }: CampoCaixaProps) {
  const {
    field: { ref, name, value, onChange, onBlur },
  } = useController<ValoresFormularioCadastro>({ name: nome });
  const erro = useErroDoCampo(nome);
  const id = idDoCampo(nome);

  return (
    <div>
      <label
        htmlFor={id}
        className={`flex min-h-11 items-start gap-3 py-2 text-sm text-ink ${travado ? "cursor-not-allowed text-muted" : "cursor-pointer"}`}
      >
        <input
          id={id}
          ref={ref}
          name={name}
          type="checkbox"
          checked={value === true}
          disabled={travado}
          onChange={(evento) => {
            onChange(evento.target.checked);
            aoMudar?.(evento.target.checked);
          }}
          onBlur={onBlur}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritoPor(id, dica, erro)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-green disabled:cursor-not-allowed"
        />
        <span>{rotulo}</span>
      </label>
      <Descricoes id={id} dica={dica} erro={erro} recuo />
    </div>
  );
}

export interface OpcaoRadio {
  valor: string;
  rotulo: string;
  descricao?: string;
}

interface GrupoRadioProps {
  nome: NomeCampo;
  legenda: string;
  opcoes: OpcaoRadio[];
  colunas?: 2 | 3;
  aoMudar?: (valor: string) => void;
}

export function GrupoRadio({ nome, legenda, opcoes, colunas = 2, aoMudar }: GrupoRadioProps) {
  const { register } = useFormContext<ValoresFormularioCadastro>();
  const erro = useErroDoCampo(nome);
  const id = idDoCampo(nome);
  const { onChange, ...registro } = register(nome);

  return (
    <fieldset aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend className="mb-2 text-sm font-medium text-ink">{legenda}</legend>
      <div className={`grid gap-2 ${colunas === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {opcoes.map((opcao, indice) => {
          const idOpcao = `${id}-${opcao.valor}`;
          return (
            <label
              key={opcao.valor}
              htmlFor={idOpcao}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-ink transition-colors hover:border-zinc-400 has-[:checked]:border-brand-green has-[:checked]:bg-brand-green/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-green"
            >
              <input
                id={idOpcao}
                type="radio"
                value={opcao.valor}
                {...registro}
                onChange={(evento) => {
                  void onChange(evento);
                  aoMudar?.(evento.target.value);
                }}
                // radio não aceita aria-invalid; o erro vem pelo
                // aria-describedby do fieldset, e isto marca onde o foco cai.
                data-erro-foco={erro && indice === 0 ? "" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-green"
              />
              <span>
                <span className="font-medium">{opcao.rotulo}</span>
                {opcao.descricao && <span className="mt-0.5 block text-xs text-muted">{opcao.descricao}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-xs text-red-600">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
