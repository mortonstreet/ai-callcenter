"use client";

import { useState } from "react";
import { Loader2, Save, Trash2, Plus, FileText, Link, Upload } from "lucide-react";
import { useUpdateElevenLabsAgent } from "@/hooks/api/useAgent";

interface KnowledgeBaseTabProps {
  agentId: string;
  config: any;
}

interface KnowledgeItem {
  id?: string;
  type: "url" | "document";
  name: string;
  url?: string;
}

export function KnowledgeBaseTab({ agentId, config }: KnowledgeBaseTabProps) {
  const updateAgent = useUpdateElevenLabsAgent();

  const initialItems: KnowledgeItem[] =
    config?.knowledge_base ??
    config?.conversation_config?.agent?.knowledge_base ??
    [];

  const [items, setItems] = useState<KnowledgeItem[]>(initialItems);
  const [urlInput, setUrlInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  function addUrl() {
    if (!urlInput.trim()) return;
    setItems((prev) => [
      ...prev,
      { type: "url", name: urlInput.trim(), url: urlInput.trim() },
    ]);
    setUrlInput("");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setItems((prev) => [
      ...prev,
      { type: "document", name: file.name },
    ]);
    e.target.value = "";
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    updateAgent.mutate({
      id: agentId,
      knowledgeBase: items,
    });
  }

  return (
    <div className="space-y-6">
      {/* Existing Items */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Knowledge Base Items</h3>
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No knowledge base items yet. Add a URL or upload a document below.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.type === "url" ? (
                    <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add URL */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Add URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/docs"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
          />
          <button
            onClick={addUrl}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b191a] text-white px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Upload Document */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Upload Document</label>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground cursor-pointer hover:bg-muted transition-colors">
            <Upload className="h-4 w-4 text-muted-foreground" />
            Choose File
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {fileName && (
            <span className="text-sm text-muted-foreground">{fileName}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Supported formats: PDF, TXT. Actual file upload requires a separate endpoint.
        </p>
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
        Save Knowledge Base
      </button>
    </div>
  );
}
