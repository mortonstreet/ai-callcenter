"use client";

import { useState, useMemo } from "react";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Page } from "@/components/dashboard/Page";
import Button from "@/components/ui/Button";
import { useLeads, useDeleteLead } from "@/hooks/api/useLeads";
import LeadTable from "@/components/leads/LeadTable";
import MobileLeadCard from "@/components/leads/MobileLeadCard";
import CreateLeadModal from "@/components/leads/CreateLeadModal";
import { toast } from "sonner";

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const deleteLead = useDeleteLead();

  // Debounce search
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    setTimer(t);
  };

  const filters = useMemo(() => ({
    page,
    limit: 25,
    search: debouncedSearch || undefined,
  }), [page, debouncedSearch]);

  const { data, isLoading } = useLeads(filters);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead? This action cannot be undone.")) return;
    try {
      await deleteLead.mutateAsync(id);
      toast.success("Lead deleted");
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const leads = data?.data || [];
  const pagination = data?.pagination;

  return (
    <Page title="Leads" subtitle="Manage your leads and prospects">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:ring-1 focus:ring-ring transition"
          />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <LeadTable leads={leads} onDelete={handleDelete} />
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden">
            <MobileLeadCard leads={leads} />
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} leads
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateLeadModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </Page>
  );
}
