/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TaskFieldType } from "@shared/types/src/task";
import { type TaskField } from "@shared/types/src";
import { useCreateTask } from "@/hooks/api/useAgent";
import { useIsAdminOrOwner, useListOrganizationMembers } from "@/hooks/api/useOrganization";
import { toast } from "sonner";

interface CreateTaskFormProps {
  agentId: string;
  onSubmit?: (data: { name: string; description?: string; fields: Omit<TaskField, 'nameSlug'>[] }) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const FIELD_TYPE_OPTIONS = [
  { value: TaskFieldType.STRING, label: "Text" },
  { value: TaskFieldType.NUMBER, label: "Number" },
  { value: TaskFieldType.ADDRESS, label: "Address" },
  { value: TaskFieldType.PHONE_NUMBER, label: "Phone Number" },
  { value: TaskFieldType.EMAIL_ADDRESS, label: "Email Address" },
  { value: TaskFieldType.BOOLEAN, label: "Boolean" },
  { value: TaskFieldType.TIME, label: "Time" },
];

export function CreateTaskForm({ agentId, onSubmit, onCancel, onSuccess }: CreateTaskFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dispatcherUserId, setDispatcherUserId] = useState<string>("");
  const [fields, setFields] = useState<Omit<TaskField, 'nameSlug'>[]>([
    { name: "", type: TaskFieldType.STRING, description: "" },
  ]);
  
  const isAdminOrOwner = useIsAdminOrOwner();
  const createTaskMutation = useCreateTask();
  const { data: membersData } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];

  const addField = () => {
    setFields([...fields, { name: "", type: TaskFieldType.STRING, description: "" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<TaskField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdminOrOwner) {
      toast.error("Only admins and owners can create tasks");
      return;
    }
    
    // Validate
    if (!name.trim()) {
      toast.error("Task name is required");
      return;
    }

    const validFields = fields.filter(f => f.name.trim());
    if (validFields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    const taskData = {
      name: name.trim(),
      description: description.trim() || undefined,
      fields: validFields,
      dispatcherUserId: dispatcherUserId || undefined,
    };

    // If custom onSubmit is provided, use it
    if (onSubmit) {
      onSubmit(taskData);
      return;
    }

    // Otherwise use the hook
    try {
      await createTaskMutation.mutateAsync({ ...taskData, agentId });
      toast.success("Task created successfully");
      onSuccess?.();
      // Reset form
      setName("");
      setDescription("");
      setDispatcherUserId("");
      setFields([{ name: "", type: TaskFieldType.STRING, description: "" }]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create task");
    }
  };

  if (!isAdminOrOwner) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm">
        <p className="text-sm text-yellow-800">
          Only admins and owners can create tasks.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="task-name" className="block text-sm font-medium text-gray-700 mb-2">
          Task Name *
        </label>
        <input
          id="task-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-black placeholder:text-gray-400"
          placeholder="e.g., Plumbing Repair"
          required
        />
      </div>

      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-black placeholder:text-gray-400"
          placeholder="Give your agent more context about this service, such as pricing current discounts, etc."
        />
      </div>

      <div>
        <label htmlFor="dispatcher-user" className="block text-sm font-medium text-gray-700 mb-2">
          Assign to User
        </label>
        <select
          id="dispatcher-user"
          value={dispatcherUserId}
          onChange={(e) => setDispatcherUserId(e.target.value)}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-black"
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
        <div className="flex items-center justify-between mb-4">
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
          {fields.map((field, index) => (
            <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
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
              {fields.length > 1 && (
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

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isAdminOrOwner || createTaskMutation.isPending}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createTaskMutation.isPending ? "Creating..." : "Create Task"}
        </button>
      </div>
    </form>
  );
}

