"use client";

import { useState, useMemo } from "react";
import { Page } from "@/components/dashboard/Page";
import { useTaskInstances } from "@/hooks/api/useTask";
import { 
  DollarSign, 
  Phone, 
  MapPin, 
  Clock, 
  User,
  GripVertical,
  ChevronDown,
  Filter,
  ExternalLink,
} from "lucide-react";
import { post } from "@/lib/api";
import { useEffectiveOrganization } from "@/lib/admin-store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Pipeline stages - Flow: New Leads → Follow Up → Booked → Dispatched → Closed Won/Lost
const PIPELINE_STAGES = [
  { id: "new", label: "New Leads", color: "yellow" },
  { id: "follow_up", label: "Follow Up", color: "orange" },
  { id: "booked", label: "Booked", color: "purple" },
  { id: "dispatched", label: "Dispatched", color: "blue" },
  { id: "closed_won", label: "Closed Won", color: "green" },
  { id: "closed_lost", label: "Closed Lost", color: "gray" },
] as const;

type PipelineStageId = typeof PIPELINE_STAGES[number]["id"];

interface LeadCard {
  id: string;
  taskName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  estimatedValue: number | null;
  leadScore: number | null;
  appointmentTime: string | null;
  createdAt: string;
  pipelineStage: string;
  status: string;
}

// Stage colors
const STAGE_COLORS: Record<string, { bg: string; border: string; header: string; badge: string }> = {
  new: { 
    bg: "bg-yellow-50", 
    border: "border-yellow-200", 
    header: "bg-yellow-100 text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700"
  },
  follow_up: { 
    bg: "bg-orange-50", 
    border: "border-orange-200", 
    header: "bg-orange-100 text-orange-800",
    badge: "bg-orange-100 text-orange-700"
  },
  booked: { 
    bg: "bg-purple-50", 
    border: "border-purple-200", 
    header: "bg-purple-100 text-purple-800",
    badge: "bg-purple-100 text-purple-700"
  },
  dispatched: { 
    bg: "bg-blue-50", 
    border: "border-blue-200", 
    header: "bg-blue-100 text-blue-800",
    badge: "bg-blue-100 text-blue-700"
  },
  closed_won: { 
    bg: "bg-green-50", 
    border: "border-green-200", 
    header: "bg-green-100 text-green-800",
    badge: "bg-green-100 text-green-700"
  },
  closed_lost: { 
    bg: "bg-gray-50", 
    border: "border-gray-200", 
    header: "bg-gray-100 text-gray-600",
    badge: "bg-gray-100 text-gray-500"
  },
};

export default function PipelinePage() {
  const router = useRouter();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const activeOrganization = useEffectiveOrganization();
  const queryClient = useQueryClient();

  // Handle card click to navigate to lead detail
  const handleCardClick = (leadId: string) => {
    router.push(`/dashboard/tasks/${leadId}`);
  };
  
  // Fetch all leads
  const { data, isLoading } = useTaskInstances({
    page: 1,
    limit: 1000,
  });

  // Transform data into lead cards
  const leads = useMemo<LeadCard[]>(() => {
    if (!data?.data) return [];
    
    return data.data.map((task) => ({
      id: task.id,
      taskName: task.taskName,
      customerName: (task.info as Record<string, string>)?.name || 
                    (task.info as Record<string, string>)?.["customer-name"] || 
                    "Unknown Customer",
      customerPhone: (task.info as Record<string, string>)?.["phone-number"] || 
                     (task.info as Record<string, string>)?.phone || "",
      customerAddress: (task.info as Record<string, string>)?.address || 
                       (task.info as Record<string, string>)?.["customer-address"] || "",
      estimatedValue: task.estimatedValue,
      leadScore: task.leadScore,
      appointmentTime: task.appointmentTime,
      createdAt: task.createdAt,
      pipelineStage: task.pipelineStage || "new",
      status: task.status,
    }));
  }, [data]);

  // Group leads by pipeline stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, LeadCard[]> = {};
    PIPELINE_STAGES.forEach((stage) => {
      grouped[stage.id] = leads.filter((lead) => lead.pipelineStage === stage.id);
    });
    return grouped;
  }, [leads]);

  // Calculate totals
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {};
    PIPELINE_STAGES.forEach((stage) => {
      const stageLeads = leadsByStage[stage.id] || [];
      totals[stage.id] = {
        count: stageLeads.length,
        value: stageLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0),
      };
    });
    return totals;
  }, [leadsByStage]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (!draggedLead || !activeOrganization?.data?.id) return;
    
    const lead = leads.find((l) => l.id === draggedLead);
    if (!lead || lead.pipelineStage === newStage) {
      setDraggedLead(null);
      return;
    }

    setIsUpdating(true);
    
    try {
      await post(`/task/${activeOrganization.data.id}/instances/${draggedLead}/pipeline`, {
        pipelineStage: newStage,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['taskInstances'] });
      toast.success(`Lead moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
    } catch (error) {
      console.error("Failed to update pipeline stage:", error);
      toast.error("Failed to move lead");
    } finally {
      setIsUpdating(false);
      setDraggedLead(null);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Total pipeline value
  const totalPipelineValue = useMemo(() => {
    return leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
  }, [leads]);

  return (
    <Page title="Pipeline" subtitle="Drag and drop leads through your sales pipeline">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-sm text-gray-500">Total Leads</div>
            <div className="text-2xl font-semibold text-gray-900">{leads.length}</div>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div>
            <div className="text-sm text-gray-500">Pipeline Value</div>
            <div className="text-2xl font-semibold text-green-600">
              {formatCurrency(totalPipelineValue)}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className={`h-4 w-4 transition ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.id] || [];
            const totals = stageTotals[stage.id];
            const colors = STAGE_COLORS[stage.id];
            const isDropTarget = dragOverStage === stage.id;
            
            return (
              <div
                key={stage.id}
                className={`
                  flex-shrink-0 w-80 rounded-xl border-2 transition-all
                  ${isDropTarget ? `${colors.border} shadow-lg scale-[1.02]` : "border-gray-200"}
                  ${isUpdating ? "opacity-50 pointer-events-none" : ""}
                `}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage header */}
                <div className={`px-4 py-3 rounded-t-xl ${colors.header}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{stage.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-white/50 rounded-full">
                        {totals.count}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm mt-1 opacity-75">
                    {formatCurrency(totals.value)}
                  </div>
                </div>

                {/* Lead cards */}
                <div className={`p-2 min-h-[400px] space-y-2 ${colors.bg} rounded-b-xl`}>
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => handleCardClick(lead.id)}
                        className={`
                          group bg-white rounded-lg border border-gray-200 p-3 cursor-pointer
                          hover:shadow-md hover:border-[var(--color-primary)] transition-all
                          ${draggedLead === lead.id ? "opacity-50 shadow-lg" : ""}
                        `}
                      >
                        {/* Header with drag handle and link icon */}
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            {/* Customer name and service */}
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900 truncate">
                                {lead.customerName}
                              </div>
                              <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {lead.taskName}
                            </div>

                            {/* Details */}
                            <div className="mt-2 space-y-1">
                              {lead.customerPhone && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{lead.customerPhone}</span>
                                </div>
                              )}
                              {lead.customerAddress && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{lead.customerAddress}</span>
                                </div>
                              )}
                              {lead.appointmentTime && (
                                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                                  <Clock className="h-3 w-3" />
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

                            {/* Footer: Value and score */}
                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                              {lead.estimatedValue ? (
                                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(lead.estimatedValue)}
                                </div>
                              ) : (
                                <div />
                              )}
                              {lead.leadScore && (
                                <div className={`
                                  px-2 py-0.5 text-xs font-medium rounded-full
                                  ${lead.leadScore >= 70 ? "bg-green-100 text-green-700" : ""}
                                  ${lead.leadScore >= 40 && lead.leadScore < 70 ? "bg-yellow-100 text-yellow-700" : ""}
                                  ${lead.leadScore < 40 ? "bg-red-100 text-red-700" : ""}
                                `}>
                                  Score: {lead.leadScore}
                                </div>
                              )}
                            </div>

                            {/* Created date */}
                            <div className="mt-2 text-[10px] text-gray-400">
                              Created {formatDate(lead.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </Page>
  );
}

