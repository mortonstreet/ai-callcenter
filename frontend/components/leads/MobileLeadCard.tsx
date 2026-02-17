"use client";

import { useRouter } from "next/navigation";
import { Phone, Mail, Building2, DollarSign } from "lucide-react";
import { Lead } from "@/hooks/api/useLeads";

interface MobileLeadCardProps {
  leads: Lead[];
}

export default function MobileLeadCard({ leads }: MobileLeadCardProps) {
  const router = useRouter();

  const formatName = (lead: Lead) => {
    const parts = [lead.firstName, lead.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unknown";
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No leads found. Add your first lead to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <div
          key={lead.id}
          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
          className="bg-card border border-border rounded-xl p-4 active:scale-[0.99] transition cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-foreground">{formatName(lead)}</div>
              {lead.title && (
                <div className="text-xs text-muted-foreground">{lead.title}</div>
              )}
            </div>
            {lead.dealValue && (
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {Number(lead.dealValue).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {lead.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {lead.company}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {lead.email}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
