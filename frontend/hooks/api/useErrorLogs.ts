import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { ErrorLogItem, ErrorLogDetail, PaginatedResponse } from "@/lib/shared-types";

interface ErrorLogParams {
  page?: number;
  limit?: number;
  severity?: string;
  status?: string;
  search?: string;
}

interface ErrorLogStatsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
}

interface ErrorLogStatsItem {
  date: string;
  count: number;
  severity?: string;
}

export function useAdminErrorLogs(params?: ErrorLogParams) {
  return useQuery({
    queryKey: ["admin", "error-logs", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.severity) searchParams.set("severity", params.severity);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.search) searchParams.set("search", params.search);
      const qs = searchParams.toString();
      return get<PaginatedResponse<ErrorLogItem>>(`/admin/error-logs${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useAdminErrorLogStats(params?: ErrorLogStatsParams) {
  return useQuery({
    queryKey: ["admin", "error-log-stats", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.groupBy) searchParams.set("groupBy", params.groupBy);
      const qs = searchParams.toString();
      return get<{ data: ErrorLogStatsItem[] }>(`/admin/error-logs/stats${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useAdminErrorLogDetail(id: string | null) {
  return useQuery({
    queryKey: ["admin", "error-logs", id],
    queryFn: async () => {
      return get<{ data: ErrorLogDetail }>(`/admin/error-logs/${id}`);
    },
    enabled: !!id,
  });
}
