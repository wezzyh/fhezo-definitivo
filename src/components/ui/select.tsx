import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green ${className}`}
        {...props}
      />
    );
  },
);

Select.displayName = "Select";
