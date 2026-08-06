"use client";

import { FormEvent, useMemo, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { env } from "@/lib/config";
import { useEffectiveOrganization } from "@/lib/admin-store";
import {
  ApiKeyScope,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/hooks/api/useApiKeys";
import { toast } from "sonner";

interface ApiKeysSettingsCardProps {
  canManageApiKeys: boolean;
}

const SCOPES: Array<{ scope: ApiKeyScope; label: string }> = [
  { scope: "api:read", label: "REST read" },
  { scope: "api:write", label: "REST write" },
  { scope: "mcp:connect", label: "MCP connect" },
];

const formatDate = (value: string | null) => {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function ApiKeysSettingsCard({
  canManageApiKeys,
}: ApiKeysSettingsCardProps) {
  const activeOrganization = useEffectiveOrganization();
  const organizationId = activeOrganization?.data?.id;
  const apiKeys = useApiKeys();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const [name, setName] = useState("Dev test key");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    "api:read",
    "api:write",
    "mcp:connect",
  ]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const curlExamples = useMemo(() => {
    if (!createdKey || !organizationId) return null;

    return {
      rest: `curl -H "Authorization: Bearer ${createdKey}" \\\n  "${env.API_URL}/agent/${organizationId}"`,
      mcp: `curl -X POST "${env.API_URL}/mcp/sse" \\\n  -H "Authorization: Bearer ${createdKey}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":"tools","method":"tools/list","params":{}}'`,
    };
  }, [createdKey, organizationId]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error("Select at least one scope");
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({
        name: name.trim(),
        scopes: selectedScopes,
        expiresAt: expiresAt || null,
      });

      setCreatedKey(result.apiKey);
    } catch {
      // Toast is handled by the mutation hook.
    }
  };

  if (!canManageApiKeys) {
    return null;
  }

  return (
    <Card title="API Keys">
      <div className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Local dev key"
            />
            <Input
              label="Expires"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
            <Button
              type="submit"
              loading={createApiKey.isPending}
              disabled={createApiKey.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            {SCOPES.map((item) => (
              <label
                key={item.scope}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(item.scope)}
                  onChange={() => toggleScope(item.scope)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                {item.label}
              </label>
            ))}
          </div>
        </form>

        {createdKey && (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-900">New API key</p>
                <p className="text-xs text-emerald-800">
                  Copy this value now. It will not be shown again.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-emerald-300 bg-white text-emerald-900"
                onClick={() => copy(createdKey)}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <code className="block rounded-md bg-white p-3 text-xs text-emerald-950 break-all">
              {createdKey}
            </code>
            {curlExamples && (
              <div className="grid gap-3 lg:grid-cols-2">
                <pre className="overflow-x-auto rounded-md bg-white p-3 text-xs text-emerald-950">
                  {curlExamples.rest}
                </pre>
                <pre className="overflow-x-auto rounded-md bg-white p-3 text-xs text-emerald-950">
                  {curlExamples.mcp}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {apiKeys.isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading API keys...
            </div>
          ) : !apiKeys.data?.keys.length ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No API keys
            </div>
          ) : (
            apiKeys.data.keys.map((key) => {
              const revoked = Boolean(key.revokedAt);

              return (
                <div
                  key={key.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{key.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          revoked
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {revoked ? "Revoked" : "Active"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {key.keyPrefix}...{key.lastFour} · Last used{" "}
                      {formatDate(key.lastUsedAt)} · Expires{" "}
                      {formatDate(key.expiresAt)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!revoked && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-red-300 text-red-700 hover:bg-red-50 md:self-start"
                      disabled={revokeApiKey.isPending}
                      onClick={() => {
                        if (confirm(`Revoke "${key.name}"?`)) {
                          revokeApiKey.mutate(key.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
