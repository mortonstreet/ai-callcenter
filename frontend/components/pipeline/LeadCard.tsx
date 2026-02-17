"use client";

import { Phone, MapPin, Clock, DollarSign } from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0]) return parts[0][0].toUpperCase();
  return "?";
}

export interface PipelineLead {
  id: string;
  taskName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  estimatedValue: number | null;
  leadScore: number | null;
  appointmentTime: string | null;
  createdAt: string;
  pipelineStageId: string | null;
  status: string;
}

interface LeadCardProps {
  lead: PipelineLead;
  isDragging?: boolean;
  onClick?: () => void;
}

export function LeadCard({ lead, isDragging, onClick }: LeadCardProps) {
  const initials = getInitials(lead.customerName);

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  const colorIndex = (lead.customerName.charCodeAt(0) || 0) % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <div
      className={`bg-card rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-all duration-200 ease-out ${
        isDragging ? "shadow-lg ring-2 ring-primary/30" : ""
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Name + Avatar */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-[10px] font-medium text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {lead.customerName}
            {lead.estimatedValue != null && lead.estimatedValue > 0 && (
              <span className="text-muted-foreground font-normal">
                {" "}&ndash; {formatCurrency(lead.estimatedValue)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Task name */}
      <div className="text-xs text-muted-foreground truncate mb-2">
        {lead.taskName}
      </div>

      {/* Info rows */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {lead.customerPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.customerPhone}</span>
          </div>
        )}
        {lead.customerAddress && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.customerAddress}</span>
          </div>
        )}
        {lead.appointmentTime && (
          <div className="flex items-center gap-2 text-blue-600">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              {new Date(lead.appointmentTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      {lead.leadScore != null && (
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-end">
          <span
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
              lead.leadScore >= 70
                ? "bg-green-100 text-green-700"
                : lead.leadScore >= 40
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {lead.leadScore}
          </span>
        </div>
      )}
    </div>
  );
}
