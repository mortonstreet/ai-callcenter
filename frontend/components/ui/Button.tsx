"use client";
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
};

export default function Button({ variant="primary", loading, className="", children, ...rest }: Props) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium focus:outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400";
  const styles = {
    primary: `bg-gradient-to-b from-[#1f1d1e] to-[#555253] text-white border border-[#0a0909]
              shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.6)]
              hover:from-[#0d0c0c] hover:to-[#3d3a3b] hover:text-white/90
              active:from-[#050505] active:to-[#2d2a2b] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.5)]
              active:text-white/80 [&:active>span]:translate-y-[1px]`,
    outline: `border border-gray-300 text-primary bg-white
              shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),inset_0_-1px_0_0_rgba(0,0,0,0.3)]
              hover:bg-gray-50
              active:bg-gray-50 active:shadow-[inset_0_2px_1px_0_rgba(0,0,0,0.2)]
              active:text-primary/70 [&:active>span]:translate-y-[1px]`,
    ghost: `text-primary hover:bg-gray-200 active:bg-gray-300`
  }[variant];

  return (
    <button className={`${base} ${styles} ${className}`} disabled={loading || rest.disabled} {...rest}>
      <span className="inline-block">{loading ? "…" : children}</span>
    </button>
  );
}
