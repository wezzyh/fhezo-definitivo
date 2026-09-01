import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
