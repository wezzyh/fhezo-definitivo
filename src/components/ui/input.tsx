import { InputHTMLAttributes, forwardRef } from "react";

// Compartilhado entre o site público e o admin — ver comentário em
// button.tsx sobre var(--admin-x, --color-y). O campo não tinha bg
// explícito antes (herdava o card/página branca) — o fallback "transparent"
// preserva isso exatamente no site público.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-md border border-[var(--admin-border-strong,#d4d4d8)] bg-[var(--admin-bg,transparent)] px-3 py-2 text-sm text-[var(--admin-text,var(--color-ink))] outline-none placeholder:text-[var(--admin-text-disabled,var(--color-muted))] focus:border-[var(--admin-focus,var(--color-brand-green))] focus:ring-1 focus:ring-[var(--admin-focus,var(--color-brand-green))] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
