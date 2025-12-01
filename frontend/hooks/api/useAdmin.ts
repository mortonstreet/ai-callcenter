import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { AdminCreateOrganizationRequest, AdminCreateAgentRequest, DBOrganization, DBAgent } from "@shared/types/src";

interface AdminStats {
  users: number;
  organizations: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  isAdmin: boolean;
  emailVerified: boolean;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await get<AdminStats>("/admin/stats");
      return res;
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      return get<{ data: AdminUser[] }>("/admin/users");
    },
  });
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: async () => {
      return get<{ data: DBOrganization[] }>("/admin/organizations");
    },
  });
}

export function useAdminCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdminCreateOrganizationRequest) => {
      return post<{ data: DBOrganization }>("/admin/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

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

