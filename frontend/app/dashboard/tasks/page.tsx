/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useTaskInstances, useUpdateTaskInstancePipeline, TaskInstanceWithRelations } from "@/hooks/api/useTask";
import { PipelineStage } from "@/lib/shared-types";
import { useListOrganizationMembers } from "@/hooks/api/useOrganization";
import { useSession } from "@/lib/auth-client";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Loader2,
  X,
  FileSpreadsheet,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Page } from "@/components/dashboard/Page";
import { useRouter } from "next/navigation";
import { useEffectiveOrganization } from "@/lib/admin-store";
import { toast } from "sonner";
import Link from "next/link";

const PIPELINE_OPTIONS = Object.values(PipelineStage);

// Export field options
const EXPORT_FIELDS = [
  { id: 'name', label: 'Name', default: true },
  { id: 'phone', label: 'Phone', default: true },
  { id: 'email', label: 'Email', default: true },
  { id: 'address', label: 'Address', default: true },
  { id: 'pipelineStage', label: 'Pipeline Stage', default: true },
  { id: 'estimatedValue', label: 'Estimated Value', default: true },
  { id: 'leadScore', label: 'Lead Score', default: true },
  { id: 'appointmentTime', label: 'Appointment Time', default: true },
  { id: 'callDate', label: 'Call Date', default: true },
  { id: 'callDuration', label: 'Call Duration', default: true },
  { id: 'transcriptSummary', label: 'Transcript Summary', default: true },
];

// Date range presets
type DateRangePreset = 'all' | '30days' | '90days' | '1year' | 'custom';

const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: '30days', label: 'Last 30 Days' },
  { id: '90days', label: 'Last 90 Days' },
  { id: '1year', label: 'Last Year' },
  { id: 'custom', label: 'Custom Range' },
];

const PIPELINE_COLORS: Record<string, string> = {
  new: "bg-yellow-100 text-yellow-800 border-yellow-300",
  follow_up: "bg-orange-100 text-orange-800 border-orange-300",
  booked: "bg-purple-100 text-purple-800 border-purple-300",
  dispatched: "bg-blue-100 text-blue-800 border-blue-300",
  closed_won: "bg-green-100 text-green-800 border-green-300",
  closed_lost: "bg-muted text-muted-foreground border-border",
};

// Helper to extract customer info from task instance
const extractCustomerInfo = (instance: TaskInstanceWithRelations) => {
  const info = instance.info as Record<string, string> || {};
  return {
    name: info.name || info["customer-name"] || info.Name || "Unknown",
    phone: info["phone-number"] || info.phone || info["Phone Number"] || "",
    address: info.address || info["customer-address"] || info["location-address"] || info.Address || "",
    email: info["email-address"] || info.email || info["Email Address"] || "",
  };
};

// Format currency
const formatCurrency = (value: number | null) => {
  if (!value) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function TasksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const activeOrganization = useEffectiveOrganization();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState<string>("");
  const [dispatcherFilter, setDispatcherFilter] = useState<string>("");
  const [hasSetDefaultDispatcher, setHasSetDefaultDispatcher] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportFields, setExportFields] = useState<Set<string>>(
    new Set(EXPORT_FIELDS.filter(f => f.default).map(f => f.id))
  );
  const [exportFilename, setExportFilename] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('30days');

  // Set default dispatcher filter to current user once loaded
  useEffect(() => {
    if (session?.user?.id && !hasSetDefaultDispatcher) {
      setDispatcherFilter(session.user.id);
      setHasSetDefaultDispatcher(true);
    }
  }, [session?.user?.id, hasSetDefaultDispatcher]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  // Memoize filters
  const filters = useMemo(() => ({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    dispatcherId: dispatcherFilter || undefined,
  }), [page, debouncedSearch, dispatcherFilter]);

  const { data, isLoading } = useTaskInstances(filters);

  const { data: membersData } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];
  const updatePipeline = useUpdateTaskInstancePipeline();

  const handlePipelineChange = async (taskInstanceId: string, newStage: string) => {
    await updatePipeline.mutateAsync({ id: taskInstanceId, pipelineStage: newStage });
  };

  const handleRowClick = (taskInstance: TaskInstanceWithRelations, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('select')) return;
    router.push(`/dashboard/tasks/${taskInstance.id}`);
  };

  const toggleExportField = (fieldId: string) => {
    setExportFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const selectAllFields = () => {
    setExportFields(new Set(EXPORT_FIELDS.map(f => f.id)));
  };

  const deselectAllFields = () => {
    setExportFields(new Set());
  };

  // Calculate date range based on preset
  const getDateRangeFromPreset = () => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined = now.toISOString();

    switch (dateRangePreset) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        startDate = exportStartDate ? new Date(exportStartDate).toISOString() : undefined;
        endDate = exportEndDate ? new Date(exportEndDate + 'T23:59:59').toISOString() : undefined;
        break;
      case 'all':
      default:
        startDate = undefined;
        endDate = undefined;
        break;
    }

    return { startDate, endDate };
  };

  const handleExport = async () => {
    if (!activeOrganization?.data?.id) {
      toast.error('No organization selected');
      return;
    }

    if (exportFields.size === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    setIsExporting(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'https://api.revcenter.ai/api';
      const { startDate, endDate } = getDateRangeFromPreset();

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('fields', Array.from(exportFields).join(','));

      const exportUrl = `${apiUrl}/task/${activeOrganization.data.id}/export?${params.toString()}`;

      const response = await fetch(exportUrl, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed:', response.status, errorText);
        throw new Error('Failed to export leads');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      if (exportFilename.trim()) {
        a.download = `${exportFilename.trim()}.csv`;
      } else {
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        a.download = filenameMatch ? filenameMatch[1] : `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      }

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Leads exported successfully');
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export leads');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter by pipeline stage client-side if set
  const filteredInstances = useMemo(() => {
    const instances = data?.data || [];
    if (!pipelineFilter) return instances;
    return instances.filter(i => i.pipelineStage === pipelineFilter);
  }, [data?.data, pipelineFilter]);

  const taskInstances = filteredInstances;
  const pagination = data?.pagination;

  return (
    <Page title="Leads" subtitle="Manage and track all leads">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <select
          value={pipelineFilter}
          onChange={(e) => {
            setPipelineFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filter by pipeline stage"
        >
          <option value="">All Pipeline Stages</option>
          {PIPELINE_OPTIONS.map((stage) => (
            <option key={stage} value={stage}>
              {stage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          value={dispatcherFilter}
          onChange={(e) => {
            setDispatcherFilter(e.target.value);
            setHasSetDefaultDispatcher(true);
            setPage(1);
          }}
          className="px-4 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filter by assignee"
        >
          <option value="">All Assignees</option>
          {session?.user?.id && (
            <option value={session.user.id}>Me</option>
          )}
          {members
            .filter((member: any) => member.userId !== session?.user?.id)
            .map((member: any) => (
              <option key={member.userId} value={member.userId}>
                {member.user?.name || member.user?.email}
              </option>
            ))}
        </select>

        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Export Leads</h2>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-accent rounded-lg transition"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  File Name <span className="text-muted-foreground/70 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-sm">.csv</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Date Range
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setDateRangePreset(preset.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        dateRangePreset === preset.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card text-foreground/80 border-border hover:bg-accent'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {dateRangePreset === 'custom' && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-muted-foreground/70">to</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground/80">
                    Fields to Export
                  </label>
                  <div className="flex gap-2">
                    <button onClick={selectAllFields} className="text-xs text-primary hover:underline">
                      Select All
                    </button>
                    <span className="text-muted-foreground/50">|</span>
                    <button onClick={deselectAllFields} className="text-xs text-muted-foreground hover:underline">
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {EXPORT_FIELDS.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={exportFields.has(field.id)}
                        onChange={() => toggleExportField(field.id)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span className="text-sm text-foreground/80">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm text-foreground/80 hover:bg-accent rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || exportFields.size === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : taskInstances.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Pipeline Stage</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Value / Score</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Appointment</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {taskInstances.map((instance: TaskInstanceWithRelations) => {
                  const customer = extractCustomerInfo(instance);
                  const currentStage = instance.pipelineStage || "new";
                  return (
                    <tr
                      key={instance.id}
                      onClick={(e) => handleRowClick(instance, e)}
                      className="hover:bg-muted/50 cursor-pointer transition"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/tasks/${instance.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {customer.name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {instance.taskName}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{customer.address}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={currentStage}
                          onChange={(e) => handlePipelineChange(instance.id, e.target.value)}
                          disabled={updatePipeline.isPending}
                          aria-label="Change pipeline stage"
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none ${
                            PIPELINE_COLORS[currentStage] || "bg-muted text-foreground border-border"
                          }`}
                        >
                          {PIPELINE_OPTIONS.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        {instance.estimatedValue && (
                          <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(instance.estimatedValue)}
                          </div>
                        )}
                        {instance.leadScore && (
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground/70" />
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              instance.leadScore >= 70 ? "bg-green-100 text-green-700" :
                              instance.leadScore >= 40 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              Score: {instance.leadScore}
                            </span>
                          </div>
                        )}
                        {!instance.estimatedValue && !instance.leadScore && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {instance.appointmentTime ? (
                          <div className="flex items-center gap-1.5 text-sm text-blue-600">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {new Date(instance.appointmentTime).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not booked</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/tasks/${instance.id}`}
                          className="p-1 rounded hover:bg-accent transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {taskInstances.map((instance: TaskInstanceWithRelations) => {
              const customer = extractCustomerInfo(instance);
              const currentStage = instance.pipelineStage || "new";
              return (
                <Link
                  key={instance.id}
                  href={`/dashboard/tasks/${instance.id}`}
                  className="block bg-card border border-border rounded-xl p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-foreground">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{instance.taskName}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      PIPELINE_COLORS[currentStage] || "bg-muted text-foreground border-border"
                    }`}>
                      {currentStage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {customer.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    {instance.estimatedValue ? (
                      <span className="text-xs font-medium text-green-600">
                        {formatCurrency(instance.estimatedValue)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {instance.appointmentTime ? (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(instance.appointmentTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} leads
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrevPage}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNextPage}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}
