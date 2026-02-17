"use client";

import { Page } from "@/components/dashboard/Page";
import { use, useState } from "react";
import { Bot, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAgent, useTasks, useUpdateTask, useDeleteTask, useDeleteAgent } from "@/hooks/api/useAgent";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { AgentExternalType, TaskFieldRequest, TaskFieldType } from "@/lib/shared-types";
import { ElevenLabsConversation } from "@/components/agent/ElevenLabsConversation";
import { CreateTaskForm } from "@/components/agent/CreateTaskForm";
import { useState } from "react";
import { useIsAdminOrOwner, useListOrganizationMembers } from "@/hooks/api/useOrganization";
import { toast } from "sonner";
import { DBTask } from "@/lib/shared-types";

interface TaskCardProps {
  task: DBTask;
  fields: Array<{ name: string; type: string; description?: string }>;
  agentId: string;
  organizationId: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  isAdminOrOwner: boolean;
}

const FIELD_TYPE_OPTIONS = [
  { value: TaskFieldType.STRING, label: "Text" },
  { value: TaskFieldType.NUMBER, label: "Number" },
  { value: TaskFieldType.ADDRESS, label: "Address" },
  { value: TaskFieldType.PHONE_NUMBER, label: "Phone Number" },
  { value: TaskFieldType.EMAIL_ADDRESS, label: "Email Address" },
  { value: TaskFieldType.BOOLEAN, label: "Boolean" },
  { value: TaskFieldType.TIME, label: "Time" },
  { value: TaskFieldType.DATE_TIME, label: "Date and Time" },
];

const ADMIN_TABS = [
  { key: "agent", label: "Agent" },
  { key: "analysis", label: "Analysis" },
  { key: "knowledge", label: "Knowledge Base" },
  { key: "tools", label: "Tools" },
  { key: "advanced", label: "Advanced" },
  { key: "test", label: "Test" },
];

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: agent, isLoading, error } = useAgent(id);
  const { data: agentConfig } = useAgentConfig(id);
  const { data: health, isLoading: healthLoading } = useAgentHealth(id);
  const isAdminOrOwner = useIsAdminOrOwner();
  const deleteAgent = useDeleteElevenLabsAgent();
  const [activeTab, setActiveTab] = useState("agent");

  // Determine if user is admin (has full tab access) vs owner (limited)
  // For now, isAdminOrOwner gives access to admin tabs
  const isAdmin = isAdminOrOwner;
  const tabs = isAdmin ? ADMIN_TABS : OWNER_TABS;

  const handleDelete = async () => {
    if (!agent) return;
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This will also delete it from ElevenLabs. This cannot be undone.`)) {
      return;
    }
    await deleteAgent.mutateAsync(agent.id);
    router.push("/dashboard/agents");
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-black placeholder:text-gray-400"
              placeholder="Service name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-black placeholder:text-gray-400"
              placeholder="Give your agent more context about this service, such as pricing current discounts, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to User
            </label>
            <select
              value={dispatcherUserId}
              onChange={(e) => setDispatcherUserId(e.target.value)}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-black"
              aria-label="Assign to user"
            >
              <option value="">No assignment (optional)</option>
              {members.map((member: any) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || "Unknown User"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Information to Capture *
              </label>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>
            <div className="space-y-3">
              {taskFields.map((field, index) => (
                <div key={index} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                          placeholder="Field name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-black placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as TaskFieldType })}
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-black"
                          aria-label="Field type"
                        >
                          {FIELD_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={field.description || ""}
                        onChange={(e) => updateField(index, { description: e.target.value })}
                        placeholder="Field description (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-black placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  {taskFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                      aria-label="Remove field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTaskMutation.isPending}
              className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {updateTaskMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{task.name}</h4>
          {task.description && (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}
          {task.dispatcherUserId && (
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Assigned to:</span>{" "}
              {members.find((m: any) => m.userId === task.dispatcherUserId)?.user?.name || 
               members.find((m: any) => m.userId === task.dispatcherUserId)?.user?.email || 
               "Unknown User"}
            </p>
          )}
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-medium">
                  {field.name} ({field.type})
                </span>
                {field.description && (
                  <span className="text-xs text-gray-500 mt-1">{field.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        {isAdminOrOwner && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              aria-label="Edit task"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteTaskMutation.isPending}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: agent, isLoading, error } = useAgent(id);
  const { data: tasks, isLoading: isLoadingTasks } = useTasks(id);
  const isAdminOrOwner = useIsAdminOrOwner();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deleteAgentMutation = useDeleteAgent();
  const router = useRouter();

  const handleDeleteAgent = async () => {
    if (!agent) return;
    try {
      await deleteAgentMutation.mutateAsync(agent.id);
      toast.success("Agent deleted successfully");
      router.push("/dashboard/agents");
    } catch {
      // Error toast is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <Page title="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-muted-foreground/70 animate-spin" />
        </div>
      </Page>
    );
  }

  if (error || !agent) {
    return (
      <Page title="Agent Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Agent not found</p>
          <Link href="/dashboard/agents" className="text-primary hover:underline">
            Back to Agents
          </Link>
        </div>
      </Page>
    );
  }

  const isElevenLabs = agent.externalType === AgentExternalType.ELEVEN_LABS;

  return (
    <Page
      title={agent.name}
      actions={
        isAdminOrOwner ? (
          <button
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleteAgent.isPending ? "Deleting..." : "Delete"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>

        {/* Agent header card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{agent.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {agent.industry && (
                    <span className="text-xs text-muted-foreground capitalize">{agent.industry.replace(/_/g, " ")}</span>
                  )}
                  {agent.useCase && (
                    <>
                      <span className="text-xs text-muted-foreground/30">|</span>
                      <span className="text-xs text-muted-foreground capitalize">{agent.useCase.replace(/_/g, " ")}</span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground/30">|</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    agent.status === "active" ? "bg-green-100 text-green-800" :
                    agent.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                    agent.status === "error" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {agent.status || "draft"}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Phone: {agent.phoneNumber}</p>
              <p>Created {new Date(agent.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Provider health</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {health?.checks?.provider?.message || "Checking provider sync status..."}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              healthLoading
                ? "bg-gray-100 text-gray-700"
                : health?.status === "healthy"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
            }`}>
              {healthLoading ? "checking" : health?.status === "healthy" ? "healthy" : "degraded"}
            </span>
          </div>
          {agent.syncPending && (
            <p className="text-xs text-amber-700 mt-3">
              Sync pending: latest provider update is queued for retry.
            </p>
          )}
          {agent.lastSyncError && (
            <p className="text-xs text-red-700 mt-2">Last sync error: {agent.lastSyncError}</p>
          )}
        </div>

        {/* Tab navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab content */}
        <div>
          {activeTab === "agent" && (
            <AgentTab agentId={agent.id} isAdmin={isAdmin} />
          )}
          {activeTab === "analysis" && isAdmin && (
            <AnalysisTab agentId={agent.id} />
          )}
          {activeTab === "knowledge" && isAdmin && (
            <KnowledgeBaseTab agentId={agent.id} config={agentConfig} />
          )}
          {activeTab === "tools" && isAdmin && (
            <ToolsTab agentId={agent.id} config={agentConfig} />
          )}
          {activeTab === "advanced" && isAdmin && (
            <AdvancedTab agentId={agent.id} config={agentConfig} />
          )}
          {activeTab === "test" && isElevenLabs && (
            <TestTab agentId={agent.externalId} />
          )}
        </div>

        {isAdminOrOwner && (
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete this agent and remove it from ElevenLabs. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              Delete Agent
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Agent"
        subtitle={`Are you sure you want to delete "${agent.name}"?`}
      >
        <p className="text-sm text-gray-600 mb-6">
          This will permanently delete the agent from both RevCenter and ElevenLabs. All associated services and data will be lost. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAgent}
            loading={deleteAgentMutation.isPending}
            disabled={deleteAgentMutation.isPending}
            className="!bg-red-600 hover:!bg-red-700"
          >
            Delete Agent
          </Button>
        </div>
      </Modal>
    </Page>
  );
}
