/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Page } from "@/components/dashboard/Page";
import { use } from "react";
import { Bot, ArrowLeft, Loader2, Edit2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAgent, useTasks, useUpdateTask, useDeleteTask } from "@/hooks/api/useAgent";
import { AgentExternalType, TaskFieldRequest, TaskFieldType } from "@shared/types/src";
import { ElevenLabsConversation } from "@/components/agent/ElevenLabsConversation";
import { CreateTaskForm } from "@/components/agent/CreateTaskForm";
import { useState } from "react";
import { useIsAdminOrOwner, useListOrganizationMembers } from "@/hooks/api/useOrganization";
import { toast } from "sonner";
import { DBTask } from "@shared/types/src";

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

function TaskCard({ task, fields, agentId, isEditing, onEdit, onCancel, onUpdate, onDelete, isAdminOrOwner }: TaskCardProps) {
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const { data: membersData } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [dispatcherUserId, setDispatcherUserId] = useState<string>(task.dispatcherUserId || "");
  const [taskFields, setTaskFields] = useState<TaskFieldRequest[]>(
    fields.map(f => ({ 
      name: f.name, 
      type: f.type as TaskFieldType, 
      description: f.description 
    }))
  );

  const addField = () => {
    setTaskFields([...taskFields, { name: "", type: TaskFieldType.STRING, description: "" }]);
  };

  const removeField = (index: number) => {
    setTaskFields(taskFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<TaskFieldRequest>) => {
    const newFields = [...taskFields];
    newFields[index] = { ...newFields[index], ...updates };
    setTaskFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Task name is required");
      return;
    }

    const validFields = taskFields.filter(f => f.name.trim());
    if (validFields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        name: name.trim(),
        description: description.trim() || undefined,
        fields: validFields,
        dispatcherUserId: dispatcherUserId || undefined,
        agentId,
      });
      toast.success("Task updated successfully");
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update task");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${task.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTaskMutation.mutateAsync({
        id: task.id,
        agentId,
      });
      toast.success("Task deleted successfully");
      onDelete();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete task");
    }
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

  if (isLoading) {
    return (
      <Page title="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </Page>
    );
  }

  if (error || !agent) {
    return (
      <Page title="Agent Not Found">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Agent not found</p>
          <Link href="/dashboard" className="text-[var(--color-primary)] hover:underline">
            Back to Agents
          </Link>
        </div>
      </Page>
    );
  }

  const isElevenLabs = agent.externalType === AgentExternalType.ELEVEN_LABS;

  return (
    <Page title={agent.name}>
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{agent.name}</h2>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Created</p>
              <p className="text-sm text-gray-900">{new Date(agent.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Updated</p>
              <p className="text-sm text-gray-900">{new Date(agent.updatedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Agent ID</p>
              <p className="text-sm text-gray-900 font-mono">{agent.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Organization ID</p>
              <p className="text-sm text-gray-900 font-mono">{agent.organizationId}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Phone Number</p>
                <p className="text-sm text-gray-900">{agent.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Redirect Number</p>
                <p className="text-sm text-gray-900">{agent.redirectNumber}</p>
              </div>
            </div>
          </div>

          {isElevenLabs && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Your Agent</h3>
              <ElevenLabsConversation agentId={agent.externalId} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Services</h3>
            {!showCreateTask && isAdminOrOwner && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
              >
                Create Service
              </button>
            )}
          </div>

          {showCreateTask ? (
            <CreateTaskForm
              agentId={agent.id}
              onSuccess={() => setShowCreateTask(false)}
              onCancel={() => setShowCreateTask(false)}
            />
          ) : isLoadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => {
                const fields = typeof task.requiredInfo === 'string' 
                  ? JSON.parse(task.requiredInfo) 
                  : task.requiredInfo;
                const isEditing = editingTaskId === task.id;
                
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    fields={fields}
                    agentId={agent.id}
                    organizationId={agent.organizationId}
                    isEditing={isEditing}
                    onEdit={() => setEditingTaskId(task.id)}
                    onCancel={() => setEditingTaskId(null)}
                    onUpdate={() => setEditingTaskId(null)}
                    onDelete={() => setEditingTaskId(null)}
                    isAdminOrOwner={isAdminOrOwner}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No services yet. Create your first service to get started.</p>
          )}
        </div>
      </div>
    </Page>
  );
}

