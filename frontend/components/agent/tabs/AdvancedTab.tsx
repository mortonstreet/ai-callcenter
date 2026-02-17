"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, ChevronDown, ChevronRight, Shield, Phone, Eye, Webhook, MessageSquare } from "lucide-react";
import { useUpdateElevenLabsAgent } from "@/hooks/api/useAgent";

interface AdvancedTabProps {
  agentId: string;
  config: any;
}

function CollapsibleSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

export function AdvancedTab({ agentId, config }: AdvancedTabProps) {
  const updateAgent = useUpdateElevenLabsAgent();

  // Security
  const [authTokenEnabled, setAuthTokenEnabled] = useState(false);
  const [allowedOrigins, setAllowedOrigins] = useState("");

  // Call Limits
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(10);
  const [dailyCallCap, setDailyCallCap] = useState(1000);

  // Privacy
  const [recordingRetention, setRecordingRetention] = useState("forever");

  // Webhooks
  const [postCallWebhookUrl, setPostCallWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<Set<string>>(new Set());

  // Conversation
  const [maxDuration, setMaxDuration] = useState(3600);
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [silenceTimeout, setSilenceTimeout] = useState(30);

  const WEBHOOK_EVENT_OPTIONS = [
    "call.started",
    "call.ended",
    "call.transferred",
    "call.failed",
    "transcript.ready",
  ];

  useEffect(() => {
    if (!config) return;

    const security = config.platform_settings?.security ?? config.security ?? {};
    const limits = config.platform_settings?.call_limits ?? config.call_limits ?? {};
    const privacy = config.platform_settings?.privacy ?? config.privacy ?? {};
    const webhooks = config.platform_settings?.webhooks ?? config.webhooks ?? {};
    const convo = config.conversation_config ?? config.conversation ?? {};

    setAuthTokenEnabled(!!security.auth_token_enabled);
    setAllowedOrigins((security.allowed_origins ?? []).join(", "));
    setMaxConcurrentCalls(limits.max_concurrent ?? 10);
    setDailyCallCap(limits.daily_cap ?? 1000);
    setRecordingRetention(privacy.recording_retention ?? "forever");
    setPostCallWebhookUrl(webhooks.post_call_url ?? "");
    setWebhookEvents(new Set(webhooks.events ?? []));
    setMaxDuration(convo.max_duration_seconds ?? 3600);
    setTextOnlyMode(!!convo.text_only_mode);
    setSilenceTimeout(convo.silence_end_call_timeout ?? 30);
  }, [config]);

  function toggleWebhookEvent(event: string) {
    setWebhookEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  }

  function handleSave() {
    updateAgent.mutate({
      id: agentId,
      security: {
        authTokenEnabled,
        allowedOrigins: allowedOrigins
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      callLimits: {
        maxConcurrent: maxConcurrentCalls,
        dailyCap: dailyCallCap,
      },
      privacy: {
        recordingRetention,
      },
      webhooks: {
        postCallUrl: postCallWebhookUrl,
        events: Array.from(webhookEvents),
      },
      conversation: {
        maxDurationSeconds: maxDuration,
        textOnlyMode,
        silenceEndCallTimeout: silenceTimeout,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Security */}
      <CollapsibleSection icon={Shield} title="Security" defaultOpen>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Auth Token Required</p>
            <p className="text-xs text-muted-foreground">Require authentication to connect</p>
          </div>
          <button
            onClick={() => setAuthTokenEnabled(!authTokenEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              authTokenEnabled ? "bg-[#1b191a]" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                authTokenEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Allowed Origins (comma separated)</label>
          <input
            type="text"
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            placeholder="https://example.com, https://app.example.com"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
      </CollapsibleSection>

      {/* Call Limits */}
      <CollapsibleSection icon={Phone} title="Call Limits">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Max Concurrent Calls</label>
          <input
            type="number"
            value={maxConcurrentCalls}
            onChange={(e) => setMaxConcurrentCalls(parseInt(e.target.value) || 0)}
            min={1}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Daily Call Cap</label>
          <input
            type="number"
            value={dailyCallCap}
            onChange={(e) => setDailyCallCap(parseInt(e.target.value) || 0)}
            min={1}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
      </CollapsibleSection>

      {/* Privacy */}
      <CollapsibleSection icon={Eye} title="Privacy">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Recording Retention</label>
          <select
            value={recordingRetention}
            onChange={(e) => setRecordingRetention(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="forever">Forever</option>
          </select>
        </div>
      </CollapsibleSection>

      {/* Webhooks */}
      <CollapsibleSection icon={Webhook} title="Webhooks">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Post-Call Webhook URL</label>
          <input
            type="url"
            value={postCallWebhookUrl}
            onChange={(e) => setPostCallWebhookUrl(e.target.value)}
            placeholder="https://api.revcenter.ai/webhooks/elevenlabs/post-call"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Events</label>
          {WEBHOOK_EVENT_OPTIONS.map((event) => (
            <label key={event} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookEvents.has(event)}
                onChange={() => toggleWebhookEvent(event)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">{event}</span>
            </label>
          ))}
        </div>
      </CollapsibleSection>

      {/* Conversation */}
      <CollapsibleSection icon={MessageSquare} title="Conversation">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Max Duration (seconds)</label>
          <input
            type="number"
            value={maxDuration}
            onChange={(e) => setMaxDuration(parseInt(e.target.value) || 0)}
            min={30}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Text-Only Mode</p>
            <p className="text-xs text-muted-foreground">Disable voice, use text chat only</p>
          </div>
          <button
            onClick={() => setTextOnlyMode(!textOnlyMode)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              textOnlyMode ? "bg-[#1b191a]" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                textOnlyMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Silence End-Call Timeout (seconds)</label>
          <input
            type="number"
            value={silenceTimeout}
            onChange={(e) => setSilenceTimeout(parseInt(e.target.value) || 0)}
            min={5}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
      </CollapsibleSection>

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
        Save Advanced Settings
      </button>
    </div>
  );
}
