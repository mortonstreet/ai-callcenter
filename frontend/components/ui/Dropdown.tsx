"use client";
import React, { useState, useRef, useEffect, ReactNode } from "react";
import { cardStyles } from "./Card";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom";
  align?: "left" | "right";
  className?: string;
}

export default function Dropdown({
  trigger,
  children,
  position = "bottom",
  align = "left",
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const positionClasses = {
    top: "bottom-full mb-0.5",
    bottom: "top-full mt-0.5",
  };

  const alignClasses = {
    left: "left-0",
    right: "right-0",
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} data-dropdown>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={`absolute ${positionClasses[position]} ${alignClasses[align]} z-50 min-w-full ${cardStyles} p-1.5 flex flex-col gap-0.5`}
        >
          <DropdownContext.Provider value={{ close: () => setIsOpen(false) }}>
            {children}
          </DropdownContext.Provider>
        </div>
      )}
    </div>
  );
}

// Context for closing dropdown from items
const DropdownContext = React.createContext<{ close: () => void }>({ close: () => {} });

export function useDropdown() {
  return React.useContext(DropdownContext);
}

// Dropdown trigger button with consistent styling
interface DropdownTriggerProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function DropdownTrigger({ children, icon, className = "" }: DropdownTriggerProps) {
  return (
    <button
      className={`
        group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-1.5 text-[15px] font-medium
        text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black cursor-pointer
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">{children}</div>
      {icon && <span className="shrink-0">{icon}</span>}
    </button>
  );
}

// Dropdown item with consistent styling
interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "danger";
  asChild?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  active = false,
  disabled = false,
  variant = "default",
  className = "",
}: DropdownItemProps) {
  const { close } = useDropdown();

  const handleClick = () => {
    onClick?.();
    close();
  };

  const variantStyles = {
    default: `hover:bg-gray-50 active:bg-gray-100 active:text-black ${active ? "bg-gray-100 text-black" : "text-neutral-600"}`,
    danger: "text-red-600 hover:bg-red-50 active:bg-red-100",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-1.5 text-[15px] font-medium rounded-lg cursor-pointer text-left
        ${variantStyles[variant]}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Dropdown link item for navigation
interface DropdownLinkProps {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DropdownLink({ href, children, onClick, className = "" }: DropdownLinkProps) {
  const { close } = useDropdown();
  const Link = require("next/link").default;

  const handleClick = () => {
    onClick?.();
    close();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`
        w-full flex items-center gap-3 px-3 py-1.5 text-[15px] font-medium rounded-lg cursor-pointer text-left
        text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black
        ${className}
      `}
    >
      {children}
    </Link>
  );
}
