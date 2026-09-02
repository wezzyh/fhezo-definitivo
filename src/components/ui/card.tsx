import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-zinc-200 bg-white p-4 ${className}`}
      {...props}
    />
  );
}
