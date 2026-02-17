import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/lib/api";
import {
  AdminCreateOrganizationRequest,
  AdminCreateAgentRequest,
  DBOrganization,
  DBAgent,
  AdminUser,
  AdminOrganization,
  PaginatedResponse,
} from "@/lib/shared-types";

interface AdminStats {
  users: number;
  organizations: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      return get<AdminStats>("/admin/stats");
    },
  });
}

export function useAdminUsers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.search) searchParams.set("search", params.search);
      const qs = searchParams.toString();
      return get<PaginatedResponse<AdminUser>>(`/admin/users${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useAdminOrganizations(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["admin", "organizations", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.search) searchParams.set("search", params.search);
      const qs = searchParams.toString();
      return get<PaginatedResponse<AdminOrganization>>(`/admin/organizations${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useImpersonateUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      return post<{ token: string }>(`/admin/users/${userId}/impersonate`);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      return del<{ success: boolean }>(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useReassignUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { userId: string; organizationId: string }) => {
      return post<{ success: boolean }>(`/admin/users/${data.userId}/reassign`, {
        organizationId: data.organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      return post<{ success: boolean; temporaryPassword?: string }>(`/admin/users/${userId}/reset-password`);
    },
  });
}

export function useAdminCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      return post<{ data: DBOrganization }>("/admin/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string) => {
      return del<{ success: boolean; message: string }>(
        `/admin/organizations/${organizationId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAddOrganizationCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { organizationId: string; amount: number }) => {
      return post<{ success: boolean; newBalance: number }>(
        `/admin/organizations/${data.organizationId}/credits`,
        { amount: data.amount }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

export function useOrganizationMembers(orgId: string | null) {
  return useQuery({
    queryKey: ["admin", "organizations", orgId, "members"],
    queryFn: async () => {
      return get<{ data: { id: string; name: string | null; email: string; role: string }[] }>(
        `/admin/organizations/${orgId}/members`
      );
    },
    enabled: !!orgId,
  });
}

export function useRemoveUserFromOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { organizationId: string; userId: string }) => {
      return del<{ success: boolean }>(
        `/admin/organizations/${data.organizationId}/members/${data.userId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

// Legacy hooks kept for backward compatibility with other components
export function useAdminCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdminCreateAgentRequest) => {
      return post<{ data: DBAgent }>("/admin/agents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

export function useAdminUpdateOrganizationLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { organizationId: string; logo: string }) => {
      return patch<{ data: DBOrganization }>(
        `/admin/organizations/${data.organizationId}/logo`,
        { logo: data.logo }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}
