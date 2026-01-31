"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Eye } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Lead } from "@/hooks/api/useLeads";

interface LeadTableProps {
  leads: Lead[];
  onDelete: (id: string) => void;
}

function RowMenu({ leadId, onView, onDelete }: { leadId: string; onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-lg hover:bg-accent text-muted-foreground transition"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition"
          >
            <Eye className="h-4 w-4" /> View
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-accent transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function LeadTable({ leads, onDelete }: LeadTableProps) {
  const router = useRouter();

  const formatName = (lead: Lead) => {
    const parts = [lead.firstName, lead.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Deal Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  No leads found. Add your first lead to get started.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                  className="hover:bg-accent cursor-pointer transition"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">{formatName(lead)}</div>
                    {lead.title && (
                      <div className="text-xs text-muted-foreground">{lead.title}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {lead.company || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground font-mono">
                    {lead.phone || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {lead.email || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {lead.dealValue ? `$${Number(lead.dealValue).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <RowMenu
                      leadId={lead.id}
                      onView={() => router.push(`/dashboard/leads/${lead.id}`)}
                      onDelete={() => onDelete(lead.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
