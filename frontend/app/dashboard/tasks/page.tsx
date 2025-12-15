/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useTaskInstances, useUpdateTaskInstanceStatus, TaskInstanceWithRelations } from "@/hooks/api/useTask";
import { TaskStatus } from "@shared/types/src";
import { useListOrganizationMembers } from "@/hooks/api/useOrganization";
import { useSession } from "@/lib/auth-client";
import { ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react";
import { Page } from "@/components/dashboard/Page";
import { useRouter } from "next/navigation";
import { cardStyles } from "@/components/ui/Card";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";

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
  const [statusFilter, setStatusFilter] = useState<string>("");
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
    if ((e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('[data-dropdown]')) {
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
              className="w-full pl-10 pr-4 py-2 border-[0.5px] border-gray-300 rounded-xl text-sm font-medium text-neutral-600 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-neutral-400"
            />
          </div>
        </div>

        <Dropdown
          trigger={
            <button className="flex items-center justify-between w-[160px] px-4 py-2 border-[0.5px] border-gray-300 rounded-xl text-sm font-medium text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black cursor-pointer shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
              <span>
                {statusFilter
                  ? statusFilter.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                  : "All Statuses"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            active={statusFilter === ""}
          >
            All Statuses
          </DropdownItem>
          {STATUS_OPTIONS.map((status) => (
            <DropdownItem
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              active={statusFilter === status}
            >
              {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </DropdownItem>
          ))}
        </Dropdown>

        <Dropdown
          trigger={
            <button className="flex items-center justify-between w-[160px] px-4 py-2 border-[0.5px] border-gray-300 rounded-xl text-sm font-medium text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black cursor-pointer shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
              <span className="truncate">
                {dispatcherFilter === ""
                  ? "All Assignees"
                  : dispatcherFilter === session?.user?.id
                    ? "Me"
                    : members.find((m: any) => m.userId === dispatcherFilter)?.user?.name ||
                      members.find((m: any) => m.userId === dispatcherFilter)?.user?.email ||
                      "Assignee"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>
          }
        >
          <DropdownItem
            onClick={() => {
              setDispatcherFilter("");
              setHasSetDefaultDispatcher(true);
              setPage(1);
            }}
            active={dispatcherFilter === ""}
          >
            All Assignees
          </DropdownItem>
          {session?.user?.id && (
            <DropdownItem
              onClick={() => {
                setDispatcherFilter(session.user.id);
                setHasSetDefaultDispatcher(true);
                setPage(1);
              }}
              active={dispatcherFilter === session.user.id}
            >
              Me
            </DropdownItem>
          )}
          {members
            .filter((member: any) => member.userId !== session?.user?.id)
            .map((member: any) => (
              <DropdownItem
                key={member.userId}
                onClick={() => {
                  setDispatcherFilter(member.userId);
                  setHasSetDefaultDispatcher(true);
                  setPage(1);
                }}
                active={dispatcherFilter === member.userId}
              >
                {member.user?.name || member.user?.email}
              </DropdownItem>
            ))}
        </Dropdown>
      </div>

      {/* Table */}
      <div className={`${cardStyles} overflow-hidden`}>
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
                      <Dropdown
                        trigger={
                          <button
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full cursor-pointer ${
                              STATUS_COLORS[instance.status] || "bg-gray-100 text-gray-800"
                            }`}
                            disabled={updateStatus.isPending}
                          >
                            {instance.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <DropdownItem
                            key={status}
                            onClick={() => handleStatusChange(instance.id, status)}
                            active={instance.status === status}
                          >
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[status]}`}
                            >
                              {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </DropdownItem>
                        ))}
                      </Dropdown>
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
                className="px-3 py-1 border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1 border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
