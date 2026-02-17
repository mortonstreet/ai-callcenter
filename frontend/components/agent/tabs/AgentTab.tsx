"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import {
  useAgentConfig,
  useOwnerUpdateElevenLabsAgent,
  useUpdateElevenLabsAgent,
} from "@/hooks/api/useAgent";
import { VoiceSelector } from "@/components/agent/VoiceSelector";

interface AgentTabProps {
  agentId: string;
  isAdmin: boolean;
}

export function AgentTab({ agentId, isAdmin }: AgentTabProps) {
  const { data: config, isLoading } = useAgentConfig(agentId);
  const updateAgent = useUpdateElevenLabsAgent();
  const ownerUpdateAgent = useOwnerUpdateElevenLabsAgent();

  const [name, setName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [llmModel, setLlmModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [dataCollectionFields, setDataCollectionFields] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [stability, setStability] = useState(0.5);
  const [speed, setSpeed] = useState(1.0);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);

  useEffect(() => {
    if (config) {
      setName(config.name ?? "");
      setFirstMessage(config.conversation_config?.agent?.first_message ?? config.first_message ?? "");
      setVoiceId(config.conversation_config?.tts?.voice_id ?? config.voice_id ?? null);
      setSystemPrompt(config.conversation_config?.agent?.prompt?.prompt ?? config.system_prompt ?? "");
      setLlmModel(config.conversation_config?.agent?.prompt?.llm ?? config.llm_model ?? "gpt-4o");
      setTemperature(config.conversation_config?.agent?.prompt?.temperature ?? config.temperature ?? 0.7);
      setMaxTokens(config.conversation_config?.agent?.prompt?.max_tokens ?? config.max_tokens ?? 1024);
      setDataCollectionFields(
        JSON.stringify(config.conversation_config?.agent?.data_collection?.fields ?? [], null, 2)
      );
      setEvaluationCriteria(
        JSON.stringify(config.platform_settings?.evaluation?.criteria ?? [], null, 2)
      );
      setStability(config.conversation_config?.tts?.stability ?? 0.5);
      setSpeed(config.conversation_config?.tts?.speed ?? 1.0);
      setSimilarityBoost(config.conversation_config?.tts?.similarity_boost ?? 0.75);
    }
  }, [config]);

  function handleSave() {
    const payload: { id: string } & Record<string, any> = { id: agentId };

    if (isAdmin) {
      payload.name = name;
      payload.firstMessage = firstMessage;
      payload.voiceId = voiceId;
      payload.systemPrompt = systemPrompt;
      payload.llmModel = llmModel;
      payload.temperature = temperature;
      payload.maxTokens = maxTokens;
      payload.stability = stability;
      payload.speed = speed;
      payload.similarityBoost = similarityBoost;
      try {
        const parsedDataCollection = JSON.parse(dataCollectionFields);
        payload.dataCollection = Array.isArray(parsedDataCollection)
          ? { fields: parsedDataCollection }
          : parsedDataCollection;
      } catch { /* ignore invalid JSON */ }
      try {
        payload.evaluationCriteria = JSON.parse(evaluationCriteria);
      } catch { /* ignore invalid JSON */ }

      updateAgent.mutate(payload);
      return;
    }

    ownerUpdateAgent.mutate({
      id: agentId,
      firstMessage,
      voiceId: voiceId || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Name (admin-managed) */}
      {isAdmin && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
            placeholder="My Agent"
          />
        </div>
      )}

      {/* First Message */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">First Message</label>
        <textarea
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-border"
          placeholder="Hello! How can I help you today?"
        />
      </div>

      {/* Voice */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Voice</label>
        <VoiceSelector value={voiceId} onChange={setVoiceId} />
      </div>

      {/* Admin-only fields */}
      {isAdmin && (
        <>
          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-border"
              placeholder="You are a helpful assistant..."
            />
          </div>

          {/* LLM Model */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">LLM Model</label>
            <select
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Temperature: {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 (Precise)</span>
              <span>2 (Creative)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Max Tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
              min={1}
              max={128000}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
            />
          </div>

          {/* Data Collection Fields */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Data Collection Fields (JSON)</label>
            <textarea
              value={dataCollectionFields}
              onChange={(e) => setDataCollectionFields(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-border"
              placeholder='[{"name": "email", "type": "string", "description": "User email"}]'
            />
          </div>

          {/* Evaluation Criteria */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Evaluation Criteria (JSON)</label>
            <textarea
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-border"
              placeholder='[{"name": "politeness", "description": "Was the agent polite?"}]'
            />
          </div>

          {/* Audio Settings */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Audio Settings</h3>

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Stability: {stability.toFixed(2)}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (Variable)</span>
                <span>1 (Stable)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Speed: {speed.toFixed(2)}
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.01}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5x</span>
                <span>2x</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Similarity Boost: {similarityBoost.toFixed(2)}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={similarityBoost}
                onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (Low)</span>
                <span>1 (High)</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={updateAgent.isPending || ownerUpdateAgent.isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] text-white px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {updateAgent.isPending || ownerUpdateAgent.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Changes
      </button>
    </div>
  );
}
