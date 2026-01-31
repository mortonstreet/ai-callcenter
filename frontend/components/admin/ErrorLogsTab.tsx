"use client";

import { useState } from "react";
import { useAdminErrorLogs } from "@/hooks/api/useErrorLogs";
import { ErrorLogItem } from "@/lib/shared-types";
import ErrorTrendChart from "./ErrorTrendChart";
import ErrorLogDetailModal from "./ErrorLogDetailModal";
import { AlertTriangle, AlertCircle, Info, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

type SeverityFilter = "all" | "error" | "warning" | "info";
type StatusFilter = "" | "open" | "resolved" | "ignored";

const SEVERITY_FILTERS: { id: SeverityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "error", label: "Errors" },
  { id: "warning", label: "Warnings" },
  { id: "info", label: "Info" },
];

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "error":
    case "critical":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
    critical: "bg-red-200 text-red-900",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[severity] || "bg-muted text-muted-foreground"}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
    ignored: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function ErrorLogsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);

  const { data, isLoading } = useAdminErrorLogs({
    page,
    limit: 20,
    severity: severityFilter === "all" ? undefined : severityFilter,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const errors = data?.data || [];
  const pagination = data?.pagination;

  const clearFilters = () => {
    setSeverityFilter("all");
    setStatusFilter("");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = severityFilter !== "all" || statusFilter !== "" || search !== "";

  return (
    <div>
      <ErrorTrendChart />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Severity pills */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setSeverityFilter(f.id); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                severityFilter === f.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search errors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading error logs...</div>
      ) : errors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>No error logs found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground/80 w-8"></th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Code</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Message</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Severity</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Status</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Product</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Organization</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/80">Time</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error: ErrorLogItem) => (
                <tr
                  key={error.id}
                  onClick={() => setSelectedErrorId(error.id)}
                  className="border-b border-border hover:bg-accent cursor-pointer transition"
                >
                  <td className="py-3 px-4">
                    <SeverityIcon severity={error.severity} />
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-foreground">{error.code}</td>
                  <td className="py-3 px-4 text-foreground max-w-xs truncate">{error.message}</td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={error.severity} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={error.status} />
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{error.product}</td>
                  <td className="py-3 px-4 text-muted-foreground">{error.organizationName || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                    {new Date(error.occurredAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border hover:bg-accent transition disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-foreground px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-border hover:bg-accent transition disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ErrorLogDetailModal
        errorId={selectedErrorId}
        onClose={() => setSelectedErrorId(null)}
      />
    </div>
  );
}
