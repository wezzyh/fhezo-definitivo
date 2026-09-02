import { ButtonHTMLAttributes, forwardRef } from "react";

type VarianteBotao = "primary" | "secondary" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VarianteBotao;
}

const estilosPorVariante: Record<VarianteBotao, string> = {
  primary: "bg-brand-green text-white hover:bg-brand-green-dark",
  secondary: "bg-dark text-white hover:bg-dark-2",
  outline: "border border-zinc-300 text-ink hover:bg-zinc-100",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${estilosPorVariante[variant]} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
