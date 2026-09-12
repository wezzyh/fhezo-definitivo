"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useCheckout } from "@/lib/checkout/contexto";
export type {
  DadosCartaoForm,
  DadosTitularForm,
} from "@/lib/pagamento/dados-cartao";
const assinar = () => () => {};
function documentoProtegido() {
  const navegacao = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  if (!navegacao) return false;
  return (
    new URL(navegacao.name).pathname.startsWith("/checkout") &&
    Boolean(document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce)
  );
}
export function FormularioCartao({ disabled }: { disabled: boolean }) {
  const checkout = useCheckout();
  const protegido = useSyncExternalStore(
    assinar,
    documentoProtegido,
    () => false,
  );
  useEffect(() => {
    // Uma navegação SPA não instala o CSP do novo documento. Antes de montar
    // os campos, recarrega se a aba veio originalmente de uma página sem CSP.
    if (!documentoProtegido()) window.location.replace(window.location.href);
  }, []);
  if (!protegido)
    return (
      <p className="form-message" role="status">
        Preparando pagamento seguro...
      </p>
    );
  const pf = checkout.tipoCliente === "PF";
  return (
    <fieldset
      disabled={disabled}
      className="form-fields card-fields"
      data-private
      data-hj-suppress
      data-clarity-mask
    >
      <legend>Dados do cartão</legend>
      <div className="card-grid">
        <label className="card-full" htmlFor="numeroCartao">
          Número do cartão
          <input
            id="numeroCartao"
            name="numeroCartao"
            autoComplete="off"
            inputMode="numeric"
            maxLength={23}
            placeholder="0000 0000 0000 0000"
            required
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .replace(/\D/g, "")
                .slice(0, 19)
                .replace(/(\d{4})(?=\d)/g, "$1 ");
            }}
          />
        </label>
        <label className="card-full" htmlFor="nomeImpresso">
          Nome impresso no cartão
          <input
            id="nomeImpresso"
            name="nomeImpresso"
            autoComplete="off"
            maxLength={100}
            required
          />
        </label>
        <label htmlFor="validadeCartao">
          Validade
          <input
            id="validadeCartao"
            name="validadeCartao"
            autoComplete="off"
            inputMode="numeric"
            placeholder="MM/AA"
            maxLength={5}
            required
            onInput={(e) => {
              const d = e.currentTarget.value.replace(/\D/g, "").slice(0, 4);
              e.currentTarget.value =
                d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
            }}
          />
        </label>
        <label htmlFor="cvv">
          Código de segurança
          <input
            id="cvv"
            name="cvv"
            type="password"
            autoComplete="off"
            inputMode="numeric"
            maxLength={4}
            placeholder="CVV"
            required
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .replace(/\D/g, "")
                .slice(0, 4);
            }}
          />
        </label>
      </div>
      <h3 className="card-holder-heading">Titular do cartão</h3>
      <div className="card-grid">
        <label className="card-full" htmlFor="nomeTitular">
          Nome completo
          <input
            id="nomeTitular"
            name="nomeTitular"
            defaultValue={pf ? checkout.dadosPF.nomeCompleto : ""}
            autoComplete="off"
            maxLength={200}
            required
          />
        </label>
        <label htmlFor="cpfTitular">
          CPF do titular
          <input
            id="cpfTitular"
            name="cpfTitular"
            defaultValue={pf ? checkout.dadosPF.cpf : ""}
            autoComplete="off"
            inputMode="numeric"
            maxLength={14}
            required
          />
        </label>
        <label htmlFor="telefoneTitular">
          Telefone com DDD
          <input
            id="telefoneTitular"
            name="telefoneTitular"
            defaultValue={
              pf ? checkout.dadosPF.telefone : checkout.dadosPJ.telefone
            }
            autoComplete="off"
            inputMode="tel"
            maxLength={20}
            required
          />
        </label>
        <label className="card-full" htmlFor="emailTitular">
          Email
          <input
            id="emailTitular"
            name="emailTitular"
            type="email"
            defaultValue={pf ? checkout.dadosPF.email : checkout.dadosPJ.email}
            autoComplete="off"
            maxLength={254}
            required
          />
        </label>
        <label htmlFor="cepTitular">
          CEP de cobrança
          <input
            id="cepTitular"
            name="cepTitular"
            defaultValue={checkout.endereco.cep}
            autoComplete="off"
            inputMode="numeric"
            maxLength={9}
            required
          />
        </label>
        <label htmlFor="numeroTitular">
          Número do endereço
          <input
            id="numeroTitular"
            name="numeroTitular"
            defaultValue={checkout.endereco.numero}
            autoComplete="off"
            maxLength={30}
            required
          />
        </label>
      </div>
      <p className="form-message">
        Pagamento processado pelo Asaas. Os dados do cartão não são salvos pela
        loja.
      </p>
    </fieldset>
  );
}
