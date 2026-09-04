import { SelectHTMLAttributes, forwardRef } from "react";

// Compartilhado entre site público e admin — ver comentário em button.tsx.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-md border border-[var(--admin-border-strong,#d4d4d8)] bg-[var(--admin-bg,white)] px-3 py-2 text-sm text-[var(--admin-text,var(--color-ink))] outline-none focus:border-[var(--admin-focus,var(--color-brand-green))] focus:ring-1 focus:ring-[var(--admin-focus,var(--color-brand-green))] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  },
);

Select.displayName = "Select";
