"use client";
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
};

export default function Button({ variant="primary", loading, className="", children, ...rest }: Props) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none active:scale-[0.98]";
  const styles = {
    primary: `bg-primary text-primary-foreground hover:opacity-90
              focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring`,
    outline: `border border-border text-foreground
              hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring`,
    ghost: `text-foreground hover:bg-accent`
  }[variant];

  return (
    <button className={`${base} ${styles} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? "…" : children}
    </button>
  );
}
