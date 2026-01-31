"use client";

import { useState, useRef, useEffect } from "react";
import { PipelineStageWithStats } from "@/hooks/api/usePipeline";
import { LeadCard, PipelineLead } from "./LeadCard";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  Check,
  X,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const STAGE_COLORS = [
  "#6B7280",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

interface PipelineColumnProps {
  stage: PipelineStageWithStats;
  leads: PipelineLead[];
  totalStages: number;
  onAddLead?: (stageId: string) => void;
  onLeadClick?: (lead: PipelineLead) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, stageId: string) => void;
  onUpdateStage?: (id: string, data: { label?: string; color?: string }) => void;
  onDeleteStage?: (id: string) => void;
  onStageDragStart?: (e: React.DragEvent, stageId: string) => void;
  onStageDragEnd?: () => void;
  onStageDragOver?: (e: React.DragEvent) => void;
  onStageDrop?: (e: React.DragEvent, targetStageId: string) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  draggedLeadId?: string | null;
  onLeadDragStart?: (leadId: string) => void;
  onLeadDragEnd?: () => void;
  isLeadDropTarget?: boolean;
}

export function PipelineColumn({
  stage,
  leads,
  totalStages,
  onAddLead,
  onLeadClick,
  onDragOver,
  onDrop,
  onUpdateStage,
  onDeleteStage,
  onStageDragStart,
  onStageDragEnd,
  onStageDragOver,
  onStageDrop,
  isDropTarget,
  draggedLeadId,
  onLeadDragStart,
  onLeadDragEnd,
  isLeadDropTarget,
}: PipelineColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(stage.label);
  const [editColor, setEditColor] = useState(stage.color);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canDelete = totalStages > 3;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleSaveEdit = () => {
    if (editLabel.trim() && onUpdateStage) {
      onUpdateStage(stage.id, { label: editLabel.trim(), color: editColor });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditLabel(stage.label);
    setEditColor(stage.color);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (canDelete && onDeleteStage) {
      if (leads.length > 0) {
        if (
          !confirm(
            `This stage has ${leads.length} lead(s). Are you sure you want to delete it?`
          )
        ) {
          return;
        }
      }
      onDeleteStage(stage.id);
    }
    setMenuOpen(false);
  };

  return (
    <div
      className={`flex flex-col w-72 flex-shrink-0 rounded-lg h-[calc(100vh-220px)] min-h-[400px] transition-all duration-200 ease-out ${
        isDropTarget
          ? "bg-primary/10 ring-2 ring-primary/50"
          : isLeadDropTarget
          ? "bg-primary/5 ring-2 ring-primary/30 scale-[1.01]"
          : "bg-muted/30"
      }`}
      onDragOver={(e) => {
        onDragOver?.(e);
        onStageDragOver?.(e);
      }}
      onDrop={(e) => {
        const droppedStageId = e.dataTransfer.getData("stageId");
        if (droppedStageId) {
          onStageDrop?.(e, stage.id);
        } else {
          onDrop?.(e, stage.id);
        }
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex-shrink-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Stage name"
              className="w-full rounded-xl border border-border px-3 py-1.5 text-sm bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-ring outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <div className="flex items-center gap-1">
              {STAGE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    editColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg hover:bg-accent transition text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSaveEdit}
                className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 flex-1 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => onStageDragStart?.(e, stage.id)}
              onDragEnd={() => onStageDragEnd?.()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-50 hover:opacity-100" />
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <h3 className="font-medium text-sm text-foreground truncate">
                {stage.label}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                {stage.leadCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onAddLead && (
                <button
                  onClick={() => onAddLead(stage.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-40">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Stage
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={!canDelete}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition ${
                        canDelete
                          ? "text-red-600 hover:bg-red-50"
                          : "text-muted-foreground/50 cursor-not-allowed"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {canDelete ? "Delete Stage" : "Min 3 stages"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {leads.map((lead) => {
          const isBeingDragged = draggedLeadId === lead.id;
          return (
            <div
              key={lead.id}
              draggable
              className={`transition-all duration-200 ease-out cursor-grab active:cursor-grabbing ${
                isBeingDragged ? "opacity-50 scale-95" : ""
              }`}
              style={{
                transform: isBeingDragged ? "rotate(2deg)" : undefined,
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData("leadId", lead.id);
                e.dataTransfer.setData("fromStageId", stage.id);
                onLeadDragStart?.(lead.id);
              }}
              onDragEnd={() => onLeadDragEnd?.()}
            >
              <LeadCard
                lead={lead}
                isDragging={isBeingDragged}
                onClick={() => onLeadClick?.(lead)}
              />
            </div>
          );
        })}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No leads
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex-shrink-0 bg-muted/30">
        <div className="flex items-center justify-center text-sm font-medium text-foreground">
          <span>{formatCurrency(stage.totalValue)}</span>
        </div>
      </div>
    </div>
  );
}
