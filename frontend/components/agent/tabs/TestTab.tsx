"use client";

import { ElevenLabsConversation } from "@/components/agent/ElevenLabsConversation";

interface TestTabProps {
  agentId: string;
}

export function TestTab({ agentId }: TestTabProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Test Your Agent</h3>
        <p className="text-sm text-muted-foreground">
          Start a live conversation to test your agent&apos;s behavior in real time.
          Make sure your microphone is enabled.
        </p>
      </div>
      <div className="pt-2">
        <ElevenLabsConversation agentId={agentId} />
      </div>
    </div>
  );
}
