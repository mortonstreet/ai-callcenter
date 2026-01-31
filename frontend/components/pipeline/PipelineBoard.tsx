"use client";

import { useMemo, useCallback, useState } from "react";
import {
  PipelineStageWithStats,
  useUpdatePipelineStage,
  useDeletePipelineStage,
  useReorderPipelineStages,
  useCreatePipelineStage,
  useMoveLead,
} from "@/hooks/api/usePipeline";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineLead } from "./LeadCard";
import Button from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface PipelineBoardProps {
  stages: PipelineStageWithStats[];
  leads: PipelineLead[];
  onAddLead?: (stageId: string) => void;
  onLeadClick?: (lead: PipelineLead) => void;
}

export function PipelineBoard({
  stages,
  leads,
  onAddLead,
  onLeadClick,
}: PipelineBoardProps) {
  const moveLead = useMoveLead();
  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();
  const reorderStages = useReorderPipelineStages();
  const createStage = useCreatePipelineStage();

  // Local state for optimistic reordering
  const [localStages, setLocalStages] = useState<PipelineStageWithStats[]>(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [leadDropTargetStageId, setLeadDropTargetStageId] = useState<
    string | null
  >(null);

  // Sync from props when stages change
  const [prevStages, setPrevStages] = useState(stages);
  if (stages !== prevStages) {
    setPrevStages(stages);
    setLocalStages([...stages].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  // Group leads by pipeline stage
  const leadsByStage = useMemo(() => {
    const map = new Map<string | null, PipelineLead[]>();
    for (const stage of localStages) {
      map.set(stage.id, []);
    }
    map.set(null, []);
    for (const lead of leads) {
      const stageId = lead.pipelineStageId;
      const existing = map.get(stageId) || [];
      existing.push(lead);
      map.set(stageId, existing);
    }
    return map;
  }, [localStages, leads]);

  const handleDragOver = useCallback(
    (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedLeadId) {
        setLeadDropTargetStageId(stageId);
      }
    },
    [draggedLeadId]
  );

  const handleLeadDragStart = useCallback((leadId: string) => {
    setDraggedLeadId(leadId);
  }, []);

  const handleLeadDragEnd = useCallback(() => {
    setDraggedLeadId(null);
    setLeadDropTargetStageId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStageId: string) => {
      e.preventDefault();
      const leadId = e.dataTransfer.getData("leadId");
      const fromStageId = e.dataTransfer.getData("fromStageId");
      setDraggedLeadId(null);
      setLeadDropTargetStageId(null);
      if (!leadId || fromStageId === targetStageId) return;

      try {
        await moveLead.mutateAsync({
          id: leadId,
          pipelineStageId: targetStageId,
        });
        toast.success("Lead moved");
      } catch {
        toast.error("Failed to move lead");
      }
    },
    [moveLead]
  );

  const handleUpdateStage = useCallback(
    async (id: string, data: { label?: string; color?: string }) => {
      setLocalStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      try {
        await updateStage.mutateAsync({ id, ...data });
        toast.success("Stage updated");
      } catch {
        setLocalStages([...stages].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.error("Failed to update stage");
      }
    },
    [updateStage, stages]
  );

  const handleDeleteStage = useCallback(
    async (id: string) => {
      setLocalStages((prev) => prev.filter((s) => s.id !== id));
      try {
        await deleteStage.mutateAsync(id);
        toast.success("Stage deleted");
      } catch {
        setLocalStages([...stages].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.error("Failed to delete stage");
      }
    },
    [deleteStage, stages]
  );

  const handleStageDragStart = useCallback(
    (e: React.DragEvent, stageId: string) => {
      e.dataTransfer.setData("stageId", stageId);
      e.dataTransfer.effectAllowed = "move";
      setDraggedStageId(stageId);
    },
    []
  );

  const handleStageDragEnd = useCallback(() => {
    setDraggedStageId(null);
    setDropTargetId(null);
  }, []);

  const handleStageDragOver = useCallback(
    (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedStageId && draggedStageId !== stageId) {
        setDropTargetId(stageId);
        setLocalStages((prev) => {
          const draggedIndex = prev.findIndex((s) => s.id === draggedStageId);
          const targetIndex = prev.findIndex((s) => s.id === stageId);
          if (
            draggedIndex === -1 ||
            targetIndex === -1 ||
            draggedIndex === targetIndex
          ) {
            return prev;
          }
          const newOrder = [...prev];
          const [removed] = newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, removed);
          return newOrder;
        });
      }
    },
    [draggedStageId]
  );

  const handleStageDrop = useCallback(
    async (e: React.DragEvent, targetStageId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData("stageId");
      setDraggedStageId(null);
      setDropTargetId(null);
      if (!draggedId || draggedId === targetStageId) return;

      const stagesPayload = localStages.map((stage, index) => ({
        id: stage.id,
        sortOrder: index,
      }));

      try {
        await reorderStages.mutateAsync({ stages: stagesPayload });
      } catch {
        setLocalStages([...stages].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.error("Failed to reorder stages");
      }
    },
    [localStages, reorderStages, stages]
  );

  const handleAddStage = useCallback(async () => {
    const newSortOrder =
      localStages.length > 0
        ? Math.max(...localStages.map((s) => s.sortOrder)) + 1
        : 0;

    try {
      await createStage.mutateAsync({
        label: "New Stage",
        color: "#6B7280",
        sortOrder: newSortOrder,
      });
      toast.success("Stage created");
    } catch {
      toast.error("Failed to create stage");
    }
  }, [localStages, createStage]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {localStages.map((stage) => (
        <div
          key={stage.id}
          className={`transition-all duration-200 ease-out ${
            draggedStageId === stage.id
              ? "opacity-50 scale-95"
              : dropTargetId === stage.id
              ? "scale-[1.02]"
              : ""
          }`}
          style={{
            transform:
              draggedStageId === stage.id ? "rotate(2deg)" : undefined,
          }}
        >
          <PipelineColumn
            stage={stage}
            leads={leadsByStage.get(stage.id) || []}
            totalStages={localStages.length}
            onAddLead={onAddLead}
            onLeadClick={onLeadClick}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={handleDrop}
            onUpdateStage={handleUpdateStage}
            onDeleteStage={handleDeleteStage}
            onStageDragStart={handleStageDragStart}
            onStageDragEnd={handleStageDragEnd}
            onStageDragOver={(e) => handleStageDragOver(e, stage.id)}
            onStageDrop={handleStageDrop}
            isDragging={draggedStageId === stage.id}
            isDropTarget={dropTargetId === stage.id}
            draggedLeadId={draggedLeadId}
            onLeadDragStart={handleLeadDragStart}
            onLeadDragEnd={handleLeadDragEnd}
            isLeadDropTarget={
              leadDropTargetStageId === stage.id && draggedLeadId !== null
            }
          />
        </div>
      ))}

      {/* Add Stage Button */}
      <div className="flex-shrink-0 w-72">
        <Button
          variant="outline"
          className="w-full h-12 border-dashed"
          onClick={handleAddStage}
          loading={createStage.isPending}
        >
          <Plus className="w-4 h-4 mr-2" />
          {createStage.isPending ? "Adding..." : "Add Stage"}
        </Button>
      </div>
    </div>
  );
}
