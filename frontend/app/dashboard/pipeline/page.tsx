"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Page } from "@/components/dashboard/Page";
import { useTaskInstances } from "@/hooks/api/useTask";
import { usePipelineStages } from "@/hooks/api/usePipeline";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { CreateLeadModal } from "@/components/pipeline/CreateLeadModal";
import { PipelineLead } from "@/components/pipeline/LeadCard";
import Button from "@/components/ui/Button";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export default function PipelinePage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>();

  const { data: stagesData, isLoading: stagesLoading } = usePipelineStages();
  const { data: leadsData, isLoading: leadsLoading } = useTaskInstances({
    page: 1,
    limit: 1000,
  });

  const stages = stagesData?.data || [];
  const isLoading = stagesLoading || leadsLoading;

  // Transform task instances into pipeline leads
  const leads = useMemo<PipelineLead[]>(() => {
    if (!leadsData?.data) return [];

    return leadsData.data.map((task) => ({
      id: task.id,
      taskName: task.taskName,
      customerName:
        (task.info as Record<string, string>)?.name ||
        (task.info as Record<string, string>)?.["customer-name"] ||
        "Unknown Customer",
      customerPhone:
        (task.info as Record<string, string>)?.["phone-number"] ||
        (task.info as Record<string, string>)?.phone ||
        "",
      customerAddress:
        (task.info as Record<string, string>)?.address ||
        (task.info as Record<string, string>)?.["customer-address"] ||
        "",
      estimatedValue: task.estimatedValue,
      leadScore: task.leadScore,
      appointmentTime: task.appointmentTime,
      createdAt: task.createdAt,
      pipelineStageId: task.pipelineStageId || null,
      status: task.status,
    }));
  }, [leadsData]);

  // Total pipeline value
  const totalPipelineValue = useMemo(() => {
    return leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
  }, [leads]);

  // Notify when new leads arrive from webhook
  const prevLeadCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevLeadCountRef.current === null) {
      prevLeadCountRef.current = leads.length;
      return;
    }
    const diff = leads.length - prevLeadCountRef.current;
    if (diff > 0) {
      toast.success(
        `${diff} new lead${diff > 1 ? "s" : ""} added to pipeline`
      );
    }
    prevLeadCountRef.current = leads.length;
  }, [leads.length]);

  const handleAddLead = (stageId: string) => {
    setSelectedStageId(stageId);
    setCreateModalOpen(true);
  };

  const handleLeadClick = (lead: PipelineLead) => {
    router.push(`/dashboard/tasks/${lead.id}`);
  };

  const handleCreateLead = async () => {
    // For now, this is a placeholder - RevCenter creates leads through phone calls
    // In the future, this could create a manual task instance
    throw new Error("Manual lead creation not yet implemented");
  };

  return (
    <Page title="Pipeline" subtitle="Manage your leads through the sales pipeline">
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} in pipeline
          </span>
          {totalPipelineValue > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(totalPipelineValue)} total value
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              const firstStage = stages[0];
              setSelectedStageId(firstStage?.id);
              setCreateModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">
            No pipeline stages found
          </p>
          <p className="text-sm text-muted-foreground">
            Pipeline stages will be created automatically when the page loads.
          </p>
        </div>
      ) : (
        <PipelineBoard
          stages={stages}
          leads={leads}
          onAddLead={handleAddLead}
          onLeadClick={handleLeadClick}
        />
      )}

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setSelectedStageId(undefined);
        }}
        pipelineStageId={selectedStageId}
        onSubmit={handleCreateLead}
      />
    </Page>
  );
}
