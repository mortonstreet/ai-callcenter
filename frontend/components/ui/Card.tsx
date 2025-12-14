"use client";
import React from "react";

type Size = "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

const sizeClass: Record<Size, string> = {
  md:  "max-w-md",
  lg:  "max-w-lg",
  xl:  "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

export const cardStyles = "bg-white rounded-xl border-[0.5px] border-gray-300 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]";

export default function Card({
  title,
  children,
  size,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={`w-full ${size ? sizeClass[size] : ''} ${cardStyles} p-6 md:p-8 overflow-hidden ${className}`}
    >
      {title && (
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
