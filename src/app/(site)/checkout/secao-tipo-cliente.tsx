"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/lib/checkout/contexto";
import { validarCPF, validarCNPJ } from "@/lib/checkout/validar-documento";
import {
  formatarCPF,
  formatarCNPJ,
  formatarTelefone,
} from "@/lib/checkout/formatar";
import { buscarDadosPorCnpj } from "@/lib/checkout/brasilapi-cnpj";

type StatusCnpj =
  | { tipo: "buscando" }
  | { tipo: "sucesso" }
  | { tipo: "erro"; mensagem: string };

export function SecaoTipoCliente() {
  const {
    tipoCliente,
    definirTipoCliente,
    dadosPF,
    atualizarDadosPF,
    dadosPJ,
    atualizarDadosPJ,
    atualizarEndereco,
  } = useCheckout();

  const consulta = useRef(0);
  const [statusCnpj, setStatusCnpj] = useState<StatusCnpj | null>(null);

  const cpfPreenchido = dadosPF.cpf.replace(/\D/g, "").length > 0;
  const cpfValido = !cpfPreenchido || validarCPF(dadosPF.cpf);

  const cnpjPreenchido = dadosPJ.cnpj.replace(/\D/g, "").length > 0;
  const cnpjValido = !cnpjPreenchido || validarCNPJ(dadosPJ.cnpj);

  async function lidarComBlurCnpj() {
    const numeros = dadosPJ.cnpj.replace(/\D/g, "");
    if (!validarCNPJ(dadosPJ.cnpj)) return;

    const atual = ++consulta.current;
    setStatusCnpj({ tipo: "buscando" });
    const resultado = await buscarDadosPorCnpj(numeros);

    if (atual !== consulta.current) return;
    if (!resultado.sucesso) {
      setStatusCnpj({ tipo: "erro", mensagem: resultado.mensagem });
      return;
    }

    atualizarDadosPJ({
      razaoSocial: resultado.dados.razaoSocial || dadosPJ.razaoSocial,
    });
    atualizarEndereco({
      cep: resultado.dados.cep,
      rua: resultado.dados.logradouro,
      numero: resultado.dados.numero,
      bairro: resultado.dados.bairro,
      cidade: resultado.dados.cidade,
      uf: resultado.dados.uf,
    });
    setStatusCnpj({ tipo: "sucesso" });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-ink">Dados do cliente</h2>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant={tipoCliente === "PF" ? "primary" : "outline"}
          aria-pressed={tipoCliente === "PF"}
          onClick={() => {
            consulta.current++;
            definirTipoCliente("PF");
          }}
        >
          Pessoa Física
        </Button>
        <Button
          type="button"
          variant={tipoCliente === "PJ" ? "primary" : "outline"}
          aria-pressed={tipoCliente === "PJ"}
          onClick={() => {
            consulta.current++;
            definirTipoCliente("PJ");
          }}
        >
          Pessoa Jurídica
        </Button>
      </div>

      {tipoCliente === "PF" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="nomeCompleto"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Nome completo *
            </label>
            <Input
              id="nomeCompleto"
              autoComplete="name"
              value={dadosPF.nomeCompleto}
              onChange={(evento) =>
                atualizarDadosPF({ nomeCompleto: evento.target.value })
              }
              required
            />
          </div>
          <div>
            <label
              htmlFor="cpf"
              className="mb-1 block text-sm font-medium text-ink"
            >
              CPF *
            </label>
            <Input
              id="cpf"
              value={dadosPF.cpf}
              onChange={(evento) =>
                atualizarDadosPF({ cpf: formatarCPF(evento.target.value) })
              }
              inputMode="numeric"
              required
            />
            {!cpfValido && (
              <p className="mt-1 text-xs text-red-600">
                Esse CPF não é válido. Confira os números digitados.
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="telefonePF"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Telefone *
            </label>
            <Input
              id="telefonePF"
              autoComplete="tel"
              value={dadosPF.telefone}
              onChange={(evento) =>
                atualizarDadosPF({
                  telefone: formatarTelefone(evento.target.value),
                })
              }
              inputMode="numeric"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="emailPF"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Email *
            </label>
            <Input
              id="emailPF"
              autoComplete="email"
              type="email"
              value={dadosPF.email}
              onChange={(evento) =>
                atualizarDadosPF({ email: evento.target.value })
              }
              required
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cnpj"
              className="mb-1 block text-sm font-medium text-ink"
            >
              CNPJ *
            </label>
            <Input
              id="cnpj"
              value={dadosPJ.cnpj}
              onChange={(evento) => {
                consulta.current++;
                setStatusCnpj(null);
                atualizarDadosPJ({ cnpj: formatarCNPJ(evento.target.value) });
              }}
              onBlur={lidarComBlurCnpj}
              inputMode="numeric"
              required
            />
            {!cnpjValido && (
              <p className="mt-1 text-xs text-red-600">
                Esse CNPJ não é válido. Confira os números digitados.
              </p>
            )}
            {statusCnpj?.tipo === "buscando" && (
              <p className="mt-1 text-xs text-muted">
                Buscando dados do CNPJ...
              </p>
            )}
            {statusCnpj?.tipo === "sucesso" && (
              <p className="mt-1 text-xs text-brand-green-dark">
                Dados preenchidos automaticamente. Confira e edite se precisar.
              </p>
            )}
            {statusCnpj?.tipo === "erro" && (
              <p className="mt-1 text-xs text-muted">{statusCnpj.mensagem}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="inscricaoEstadual"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Inscrição estadual
            </label>
            <Input
              id="inscricaoEstadual"
              value={dadosPJ.inscricaoEstadual}
              onChange={(evento) =>
                atualizarDadosPJ({ inscricaoEstadual: evento.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="razaoSocial"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Razão social *
            </label>
            <Input
              id="razaoSocial"
              value={dadosPJ.razaoSocial}
              onChange={(evento) =>
                atualizarDadosPJ({ razaoSocial: evento.target.value })
              }
              required
            />
          </div>
          <div>
            <label
              htmlFor="telefonePJ"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Telefone *
            </label>
            <Input
              id="telefonePJ"
              value={dadosPJ.telefone}
              onChange={(evento) =>
                atualizarDadosPJ({
                  telefone: formatarTelefone(evento.target.value),
                })
              }
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label
              htmlFor="emailPJ"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Email *
            </label>
            <Input
              id="emailPJ"
              type="email"
              value={dadosPJ.email}
              onChange={(evento) =>
                atualizarDadosPJ({ email: evento.target.value })
              }
              required
            />
          </div>
        </div>
      )}
    </section>
  );
}
