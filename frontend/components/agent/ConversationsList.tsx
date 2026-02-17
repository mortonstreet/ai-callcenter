"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { useAgentConversations } from "@/hooks/api/useAgent";

interface ConversationsListProps {
  agentId: string;
}

export function ConversationsList({ agentId }: ConversationsListProps) {
  const { data, isLoading } = useAgentConversations(agentId);

  const conversations: any[] = data?.conversations ?? data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted p-8 text-center">
        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cost</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Summary</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((convo: any, index: number) => {
            const date = convo.created_at ?? convo.date ?? convo.start_time;
            const formattedDate = date
              ? new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--";

            const duration = convo.duration ?? convo.duration_seconds ?? 0;
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const formattedDuration = `${minutes}m ${seconds}s`;

            const cost = convo.cost ?? convo.total_cost ?? 0;
            const summary = convo.summary ?? convo.analysis?.summary ?? "--";

            return (
              <tr
                key={convo.id ?? convo.conversation_id ?? index}
                className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3 text-foreground whitespace-nowrap">{formattedDate}</td>
                <td className="px-4 py-3 text-foreground whitespace-nowrap">{formattedDuration}</td>
                <td className="px-4 py-3 text-foreground whitespace-nowrap">
                  ${typeof cost === "number" ? cost.toFixed(2) : cost}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{summary}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
