"use client";

import { Page } from "@/components/dashboard/Page";
import Link from "next/link";
import { Bot, Loader2 } from "lucide-react";
import { useAgents } from "@/hooks/api/useAgent";

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();

  return (
    <Page 
      title="Agents" 
      subtitle="Your AI agents"
    >
      <div className="space-y-4">
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
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition">
                  {agent.name}
                </h3>
                <div className="text-xs text-muted-foreground space-y-1">
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
            <a 
              href="mailto:support@revcenter.ai" 
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"
            >
              Contact Support to Get Started
            </a>
          </div>
        )}
      </div>
    </Page>
  );
}
