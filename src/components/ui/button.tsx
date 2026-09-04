import { ButtonHTMLAttributes, forwardRef } from "react";

// Componente compartilhado entre o site público (checkout, carrinho...) e
// o painel /admin — os dois têm paletas diferentes (ver
// src/app/globals.css). Em vez de um prop de "tema", cada variante usa
// `var(--admin-x, var(--color-y))`: dentro do admin (escopo
// [data-admin-theme]), --admin-x existe e vence; fora dele, a variável
// não existe e o navegador usa o fallback --color-y — o token público de
// sempre. Resultado: nenhum call-site muda, o site público continua
// pixel-a-pixel igual a antes, e o mesmo <Button> se re-tematiza sozinho
// conforme o container em que é renderizado.

type VarianteBotao = "primary" | "secondary" | "outline" | "ghost" | "danger";
type TamanhoBotao = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VarianteBotao;
  size?: TamanhoBotao;
  /** Mostra um spinner e desabilita o botão — para ações assíncronas em andamento. */
  loading?: boolean;
}

const estilosPorVariante: Record<VarianteBotao, string> = {
  primary:
    "bg-[var(--admin-green,var(--color-brand-green))] text-white " +
    "hover:bg-[var(--admin-green-hover,var(--color-brand-green-dark))] " +
    "active:bg-[var(--admin-green-active,var(--color-brand-green-dark))]",
  secondary:
    "bg-[var(--admin-surface,var(--color-dark))] text-[var(--admin-text,white)] " +
    "hover:bg-[var(--admin-surface-hover,var(--color-dark-2))]",
  outline:
    "border border-[var(--admin-border-strong,#d4d4d8)] text-[var(--admin-text,var(--color-ink))] " +
    "hover:bg-[var(--admin-surface-hover,#f4f4f5)]",
  ghost:
    "text-[var(--admin-text-secondary,var(--color-muted))] " +
    "hover:bg-[var(--admin-surface-hover,#f4f4f5)] hover:text-[var(--admin-text,var(--color-ink))]",
  danger: "bg-[var(--admin-danger,#dc2626)] text-white hover:bg-[var(--admin-danger-hover,#b91c1c)]",
};

const estilosPorTamanho: Record<TamanhoBotao, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

function IconeCarregando() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`inline-flex items-center justify-center rounded-md font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-focus,var(--color-brand-green))] disabled:cursor-not-allowed disabled:opacity-50 ${estilosPorVariante[variant]} ${estilosPorTamanho[size]} ${className}`}
        {...props}
      >
        {loading && <IconeCarregando />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
