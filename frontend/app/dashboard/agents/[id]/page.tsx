"use client";

import { Page } from "@/components/dashboard/Page";
import { use, useEffect, useState } from "react";
import { Bot, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAgent, useAgentConfig, useAgentHealth, useDeleteElevenLabsAgent } from "@/hooks/api/useAgent";
import { AgentExternalType } from "@/lib/shared-types";
import { useCurrentOrganizationRole } from "@/hooks/api/useOrganization";
import { useRouter } from "next/navigation";
import { TabNavigation } from "@/components/agent/tabs/TabNavigation";
import { AgentTab } from "@/components/agent/tabs/AgentTab";
import { AnalysisTab } from "@/components/agent/tabs/AnalysisTab";
import { KnowledgeBaseTab } from "@/components/agent/tabs/KnowledgeBaseTab";
import { ToolsTab } from "@/components/agent/tabs/ToolsTab";
import { AdvancedTab } from "@/components/agent/tabs/AdvancedTab";
import { TestTab } from "@/components/agent/tabs/TestTab";

const OWNER_TABS = [
  { key: "agent", label: "Agent" },
  { key: "test", label: "Test" },
];

const ADMIN_TABS = [
  { key: "agent", label: "Agent" },
  { key: "analysis", label: "Analysis" },
  { key: "knowledge", label: "Knowledge Base" },
  { key: "tools", label: "Tools" },
  { key: "advanced", label: "Advanced" },
  { key: "test", label: "Test" },
];

const VIEW_ONLY_TABS = [
  { key: "test", label: "Test" },
];

const CHECK_ORDER = [
  "provider",
  "profile",
  "workflow",
  "knowledge_base",
  "tools_mcp",
  "webhook",
  "tests",
  "queues",
] as const;

const CHECK_LABELS: Record<(typeof CHECK_ORDER)[number], string> = {
  provider: "Provider",
  profile: "Profile",
  workflow: "Workflow",
  knowledge_base: "Knowledge Base",
  tools_mcp: "Tools + MCP",
  webhook: "Webhook",
  tests: "Smoke Tests",
  queues: "Queues",
};

function getOverallStatusClasses(status?: "healthy" | "degraded" | "blocked") {
  if (status === "healthy") return "bg-green-100 text-green-800";
  if (status === "blocked") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

function getCheckStatusClasses(status?: "ok" | "degraded" | "failed" | "blocked") {
  if (status === "ok") return "bg-green-100 text-green-800";
  if (status === "failed" || status === "blocked") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: agent, isLoading, error } = useAgent(id);
  const { data: agentConfig } = useAgentConfig(id);
  const { data: health, isLoading: healthLoading } = useAgentHealth(id);
  const currentRole = useCurrentOrganizationRole();
  const isAdmin = currentRole === "admin";
  const isOwner = currentRole === "owner";
  const isAdminOrOwner = isAdmin || isOwner;
  const deleteAgent = useDeleteElevenLabsAgent();
  const [activeTab, setActiveTab] = useState("agent");

  const tabs = isAdmin ? ADMIN_TABS : isOwner ? OWNER_TABS : VIEW_ONLY_TABS;

  useEffect(() => {
    if (!isAdminOrOwner && activeTab === "agent") {
      setActiveTab("test");
    }
  }, [isAdminOrOwner, activeTab]);

  const handleDelete = async () => {
    if (!agent) return;
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This will also delete it from ElevenLabs. This cannot be undone.`)) {
      return;
    }
    await deleteAgent.mutateAsync(agent.id);
    router.push("/dashboard/agents");
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
  const readinessChecks = CHECK_ORDER.map((checkName) => ({
    key: checkName,
    label: CHECK_LABELS[checkName],
    check: health?.checks?.[checkName],
  }));

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
              <p className="text-sm font-medium text-foreground">Readiness health</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {healthLoading
                  ? "Running readiness checks..."
                  : health?.activation?.allowed
                    ? "Activation allowed by readiness policy."
                    : `Activation blocked by: ${(health?.activation?.deniedBy || []).join(", ") || "policy checks"}.`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              healthLoading ? "bg-gray-100 text-gray-700" : getOverallStatusClasses(health?.status)
            }`}>
              {healthLoading ? "checking" : health?.status || "degraded"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {readinessChecks.map(({ key, label, check }) => (
              <div key={key} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getCheckStatusClasses(check?.status)}`}>
                    {check?.status || "checking"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {check?.message || "Pending check result..."}
                </p>
                {check?.remediationAction && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    Remediation: {check.remediationAction}
                  </p>
                )}
              </div>
            ))}
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
            isAdminOrOwner ? (
            <AgentTab agentId={agent.id} isAdmin={isAdmin} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Only admins and owners can edit agent settings.
              </div>
            )
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
      </div>
    </Page>
  );
}
