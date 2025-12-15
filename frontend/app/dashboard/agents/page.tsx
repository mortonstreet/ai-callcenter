"use client";

import { Page } from "@/components/dashboard/Page";
import Link from "next/link";
import { Bot, Loader2 } from "lucide-react";
import { useAgents } from "@/hooks/api/useAgent";
import { cardStyles } from "@/components/ui/Card";

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
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-red-800">Failed to load agents. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && agents && agents.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                className={`group p-6 ${cardStyles} transition-colors hover:bg-gray-50 active:bg-gray-100 cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {agent.name}
                </h3>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Phone: {agent.phoneNumber}</p>
                  <p>Created {new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && (!agents || agents.length === 0) && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No agents yet</p>
            <a
              href="mailto:support@vaci.com"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium cursor-pointer
                bg-gradient-to-b from-[#1f1d1e] to-[#555253] text-white border border-[#0a0909]
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.6)]
                hover:from-[#0d0c0c] hover:to-[#3d3a3b] hover:text-white/90
                active:from-[#050505] active:to-[#2d2a2b] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.5)]
                active:text-white/80 [&:active>span]:translate-y-[1px]"
            >
              <span className="inline-block">Contact Support to Get Started</span>
            </a>
          </div>
        )}
      </div>
    </Page>
  );
}
