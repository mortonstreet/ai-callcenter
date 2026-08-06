/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, post } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/config";
import { useEffectiveOrganization } from "@/lib/admin-store";
import { toast } from "sonner";

export type ApiKeyScope = "api:read" | "api:write" | "mcp:connect";

export type ApiKeyRecord = {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  scopes: ApiKeyScope[];
  createdByUserId: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useApiKeys() {
  const activeOrganization = useEffectiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  return useQuery<{ keys: ApiKeyRecord[] }>({
    queryKey: QUERY_KEYS.apiKeys(organizationId),
    queryFn: async () => {
      if (!organizationId) throw new Error("No active organization");
      return await get<{ keys: ApiKeyRecord[] }>(`/api-keys/${organizationId}`);
    },
    enabled: Boolean(organizationId),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  return useMutation({
    mutationFn: async (input: {
      name: string;
      scopes: ApiKeyScope[];
      expiresAt?: string | null;
    }) => {
      if (!organizationId) throw new Error("No active organization");
      return await post<{ apiKey: string; key: ApiKeyRecord }>(
        `/api-keys/${organizationId}`,
        {
          ...input,
          organizationId,
          expiresAt: input.expiresAt || null,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys(organizationId) });
      toast.success("API key created");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create API key");
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error("No active organization");
      return await del<{ key: ApiKeyRecord }>(`/api-keys/${organizationId}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys(organizationId) });
      toast.success("API key revoked");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to revoke API key");
    },
  });
}
