/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useTaskInstances, useUpdateTaskInstanceStatus, TaskInstanceWithRelations } from "@/hooks/api/useTask";
import { TaskStatus } from "@shared/types/src";
import { useListOrganizationMembers } from "@/hooks/api/useOrganization";
import { useSession } from "@/lib/auth-client";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Page } from "@/components/dashboard/Page";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = Object.values(TaskStatus);

const STATUS_COLORS: Record<string, string> = {
  [TaskStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [TaskStatus.DISPATCHED]: "bg-blue-100 text-blue-800",
  [TaskStatus.IN_PROGRESS]: "bg-purple-100 text-purple-800",
  [TaskStatus.COMPLETED]: "bg-green-100 text-green-800",
  [TaskStatus.CANCELLED]: "bg-gray-100 text-gray-800",
};

export default function TasksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(TaskStatus.PENDING);
  const [dispatcherFilter, setDispatcherFilter] = useState<string>("");
  const [hasSetDefaultDispatcher, setHasSetDefaultDispatcher] = useState(false);
  
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
        setPage(1); // Reset to first page when search changes
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);
  
  // Memoize filters to prevent unnecessary re-renders
  const filters = useMemo(() => ({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    dispatcherId: dispatcherFilter || undefined,
  }), [page, debouncedSearch, statusFilter, dispatcherFilter]);
  
  const { data, isLoading } = useTaskInstances(filters);
  
  const { data: membersData } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];
  const updateStatus = useUpdateTaskInstanceStatus();

  const handleStatusChange = async (taskInstanceId: string, newStatus: string) => {
    await updateStatus.mutateAsync({ id: taskInstanceId, status: newStatus });
  };

  const handleRowClick = (taskInstance: TaskInstanceWithRelations, e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdowns/selects
    if ((e.target as HTMLElement).closest('select')) {
      return;
    }
    
    router.push(`/dashboard/tasks/${taskInstance.id}`);
  };

  if (isLoading) {
    return (
      <Page title="Tasks" subtitle="Manage and track all tasks">
        <div className="text-center text-gray-500">Loading tasks...</div>
      </Page>
    );
  }

  const taskInstances = data?.data || [];
  const pagination = data?.pagination;

  return (
    <Page title="Tasks" subtitle="Manage and track all tasks">
      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by task name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-black"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-black"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          value={dispatcherFilter}
          onChange={(e) => {
            setDispatcherFilter(e.target.value);
            setHasSetDefaultDispatcher(true); // Mark as manually changed
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-black"
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taskInstances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                taskInstances.map((instance: TaskInstanceWithRelations) => (
                  <tr 
                    key={instance.id} 
                    onClick={(e) => handleRowClick(instance, e)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {instance.taskName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {instance.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {instance.dispatcherName || instance.dispatcherEmail || "Unassigned"}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={instance.status}
                        onChange={(e) => handleStatusChange(instance.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-[var(--color-primary)] ${
                          STATUS_COLORS[instance.status] || "bg-gray-100 text-gray-800"
                        }`}
                        disabled={updateStatus.isPending}
                        aria-label="Change task status"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(instance.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
