"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import Link from "next/link";
import { Bot, Loader2, Plus } from "lucide-react";
import { useAgents } from "@/hooks/api/useAgent";
import { useIsAdminOrOwner } from "@/hooks/api/useOrganization";
import { useSession } from "@/lib/auth-client";
import { DBUser } from "@/lib/shared-types";
import { useState } from "react";
import { CreateAgentWizard } from "@/components/agent/CreateAgentWizard";

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();
  const isAdminOrOwner = useIsAdminOrOwner();
  const { data: session } = useSession();
  const isGlobalAdmin = (session?.user as DBUser | undefined)?.isAdmin === true;
  const canCreateAgent = isGlobalAdmin || isAdminOrOwner;
  const [showWizard, setShowWizard] = useState(false);
  const degradedAgents = (agents || []).filter(
    (agent: any) =>
      agent?.degradedMode?.enabled || agent?.syncPending || agent?.status === "error",
  );

  return (
    <Page
      title="Agents"
      subtitle="Your AI agents"
      actions={
        canCreateAgent ? (
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Agent
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {isAdminOrOwner && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Agent
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground/70 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">Failed to load agents. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && agents && agents.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                className="group card-hover p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    agent.status === "active"
                      ? "bg-green-100 text-green-800"
                      : agent.status === "paused"
                        ? "bg-yellow-100 text-yellow-800"
                        : agent.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                  }`}>
                    {agent.status || "draft"}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition">
                  {agent.name}
                </h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  {agent.industry && (
                    <p className="capitalize">{agent.industry.replace(/_/g, " ")}</p>
                  )}
                  <p>Phone: {agent.phoneNumber}</p>
                  <p>Created {new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && (!agents || agents.length === 0) && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No agents yet</p>
            {canCreateAgent ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Your First Agent
              </button>
            )}
          </div>
        )}
      </div>

      <CreateAgentWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </Page>
  );
}
