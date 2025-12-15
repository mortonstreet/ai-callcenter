"use client";
import React from "react";
import { LucideIcon } from "lucide-react";
import { cardStyles } from "./Card";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  subtitle,
  isLoading = false,
}: StatsCardProps) {
  return (
    <div className={`${cardStyles} p-6`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-[#5e64ff]" />
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-3xl font-semibold text-gray-900">
        {isLoading ? "..." : value}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
