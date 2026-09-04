import { TextareaHTMLAttributes, forwardRef } from "react";

// Compartilhado entre site público e admin — ver comentário em button.tsx.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-md border border-[var(--admin-border-strong,#d4d4d8)] bg-[var(--admin-bg,transparent)] px-3 py-2 text-sm text-[var(--admin-text,var(--color-ink))] outline-none placeholder:text-[var(--admin-text-disabled,var(--color-muted))] focus:border-[var(--admin-focus,var(--color-brand-green))] focus:ring-1 focus:ring-[var(--admin-focus,var(--color-brand-green))] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
