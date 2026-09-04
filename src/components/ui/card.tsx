import { HTMLAttributes } from "react";

// Compartilhado entre o site público e o admin — ver comentário em
// button.tsx sobre a técnica de var(--admin-x, --color-y): dentro do
// admin, a superfície/borda escura vence; fora dele, cai no branco/cinza
// de sempre.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-[var(--admin-border,#e4e4e7)] bg-[var(--admin-surface,white)] p-4 ${className}`}
      {...props}
    />
  );
}
