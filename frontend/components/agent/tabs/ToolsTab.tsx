"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Plus, Trash2, Wrench, Globe } from "lucide-react";
import { useUpdateElevenLabsAgent } from "@/hooks/api/useAgent";

interface ToolsTabProps {
  agentId: string;
  config: any;
}

interface WebhookTool {
  url: string;
  method: "GET" | "POST";
  description: string;
}

const SYSTEM_TOOLS = [
  { key: "end_call", label: "End Call", description: "Allow agent to end the call" },
  { key: "transfer_to_number", label: "Transfer to Number", description: "Transfer call to a phone number" },
  { key: "language_detection", label: "Language Detection", description: "Detect caller language" },
] as const;

export function ToolsTab({ agentId, config }: ToolsTabProps) {
  const updateAgent = useUpdateElevenLabsAgent();

  const configTools: any[] =
    config?.conversation_config?.agent?.tools ?? config?.tools ?? [];

  const [enabledSystemTools, setEnabledSystemTools] = useState<Set<string>>(new Set());
  const [webhookTools, setWebhookTools] = useState<WebhookTool[]>([]);
  const [newWebhook, setNewWebhook] = useState<WebhookTool>({
    url: "",
    method: "POST",
    description: "",
  });

  useEffect(() => {
    const systemEnabled = new Set<string>();
    const webhooks: WebhookTool[] = [];

    for (const tool of configTools) {
      if (tool.type === "system" || SYSTEM_TOOLS.some((st) => st.key === tool.name)) {
        systemEnabled.add(tool.name ?? tool.key ?? "");
      } else if (tool.type === "webhook" || tool.url) {
        webhooks.push({
          url: tool.url ?? "",
          method: tool.method ?? "POST",
          description: tool.description ?? "",
        });
      }
    }

    setEnabledSystemTools(systemEnabled);
    setWebhookTools(webhooks);
  }, [config]);

  function toggleSystemTool(key: string) {
    setEnabledSystemTools((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function addWebhook() {
    if (!newWebhook.url.trim()) return;
    setWebhookTools((prev) => [...prev, { ...newWebhook }]);
    setNewWebhook({ url: "", method: "POST", description: "" });
  }

  function removeWebhook(index: number) {
    setWebhookTools((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const tools: any[] = [];

    for (const key of enabledSystemTools) {
      tools.push({ type: "system", name: key });
    }

    for (const wh of webhookTools) {
      tools.push({ type: "webhook", ...wh });
    }

    updateAgent.mutate({ id: agentId, tools });
  }

  return (
    <div className="space-y-6">
      {/* System Tools */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">System Tools</h3>
        <div className="space-y-2">
          {SYSTEM_TOOLS.map((tool) => (
            <div
              key={tool.key}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleSystemTool(tool.key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  enabledSystemTools.has(tool.key) ? "bg-[#1b191a]" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    enabledSystemTools.has(tool.key) ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Tools */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Custom Webhook Tools</h3>

        {webhookTools.length > 0 && (
          <div className="space-y-2">
            {webhookTools.map((wh, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{wh.url}</p>
                    <p className="text-xs text-muted-foreground">
                      {wh.method} &mdash; {wh.description || "No description"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeWebhook(index)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add webhook form */}
        <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Webhook URL</label>
            <input
              type="url"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://api.example.com/webhook"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
            />
          </div>
          <div className="flex gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Method</label>
              <select
                value={newWebhook.method}
                onChange={(e) =>
                  setNewWebhook((prev) => ({
                    ...prev,
                    method: e.target.value as "GET" | "POST",
                  }))
                }
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm text-muted-foreground">Description</label>
              <input
                type="text"
                value={newWebhook.description}
                onChange={(e) =>
                  setNewWebhook((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="What this webhook does"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
              />
            </div>
          </div>
          <button
            onClick={addWebhook}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b191a] text-white px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={updateAgent.isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] text-white px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {updateAgent.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Tools
      </button>
    </div>
  );
}
