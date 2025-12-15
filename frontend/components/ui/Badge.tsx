"use client";

import React from "react";

type BadgeVariant = "primary" | "gray" | "green" | "yellow" | "purple" | "red";

type Props = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
  green: "bg-green-100 text-green-700 border-green-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

export default function Badge({ variant = "gray", children, className = "" }: Props) {
  const base = "inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full border";

  return (
    <span className={`${base} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
