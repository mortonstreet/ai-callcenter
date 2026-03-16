"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import {
  IntegrationConnection,
  IntegrationProvider,
  useConnectIntegration,
  useDisconnectIntegration,
  useIntegrationSyncJobs,
  useIntegrations,
  useStartPullSync,
  useStartPushSync,
  useTestIntegration,
  useUpdateIntegrationConfig,
} from "@/hooks/api/useIntegrations";

interface IntegrationsSettingsCardProps {
  canManageIntegrations: boolean;
}

interface ProviderMeta {
  provider: IntegrationProvider;
  label: string;
  description: string;
  kind: "crm" | "calendar";
}

interface ProviderConfigForm {
  pullCustomers: boolean;
  pullJobs: boolean;
  pushLeads: boolean;
  pushAppointments: boolean;
  autoSync: boolean;
  syncWindowDays: number;
  followUpDurationMinutes: number;
  slotIntervalMinutes: number;
  availabilityWindowDays: number;
  minimumNoticeHours: number;
  workingHoursStart: number;
  workingHoursEnd: number;
}

const PROVIDERS: ProviderMeta[] = [
  {
    provider: "google_calendar",
    label: "Google Calendar",
    description:
      "Connect the org admin calendar so the agent can check real-time availability and book contractor follow-up calls.",
    kind: "calendar",
  },
  {
    provider: "jobber",
    label: "Jobber",
    description: "Sync customers and jobs, and push booked outcomes back to Jobber.",
    kind: "crm",
  },
  {
    provider: "workiz",
    label: "Workiz",
    description: "Token-based CRM connection for contacts, service requests, and appointments.",
    kind: "crm",
  },
  {
    provider: "servicetitan",
    label: "ServiceTitan",
    description: "Bi-directional sync for customers, calls, jobs, and booking outcomes.",
    kind: "crm",
  },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  connected: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  disconnected: "bg-muted text-muted-foreground border border-border",
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  error: "bg-red-50 text-red-700 border border-red-200",
};

const defaultConfig: ProviderConfigForm = {
  pullCustomers: true,
  pullJobs: true,
  pushLeads: true,
  pushAppointments: false,
  autoSync: false,
  syncWindowDays: 14,
  followUpDurationMinutes: 15,
  slotIntervalMinutes: 30,
  availabilityWindowDays: 7,
  minimumNoticeHours: 2,
  workingHoursStart: 9,
  workingHoursEnd: 17,
};

const asBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  return fallback;
};

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toFormConfig = (integration?: IntegrationConnection): ProviderConfigForm => {
  const config = integration?.config || {};
  return {
    pullCustomers: asBoolean(config.pullCustomers, defaultConfig.pullCustomers),
    pullJobs: asBoolean(config.pullJobs, defaultConfig.pullJobs),
    pushLeads: asBoolean(config.pushLeads, defaultConfig.pushLeads),
    pushAppointments: asBoolean(
      config.pushAppointments,
      defaultConfig.pushAppointments,
    ),
    autoSync: asBoolean(config.autoSync, defaultConfig.autoSync),
    syncWindowDays: asNumber(config.syncWindowDays, defaultConfig.syncWindowDays),
    followUpDurationMinutes: asNumber(
      config.followUpDurationMinutes,
      defaultConfig.followUpDurationMinutes,
    ),
    slotIntervalMinutes: asNumber(
      config.slotIntervalMinutes,
      defaultConfig.slotIntervalMinutes,
    ),
    availabilityWindowDays: asNumber(
      config.availabilityWindowDays,
      defaultConfig.availabilityWindowDays,
    ),
    minimumNoticeHours: asNumber(
      config.minimumNoticeHours,
      defaultConfig.minimumNoticeHours,
    ),
    workingHoursStart: asNumber(
      config.workingHoursStart,
      defaultConfig.workingHoursStart,
    ),
    workingHoursEnd: asNumber(
      config.workingHoursEnd,
      defaultConfig.workingHoursEnd,
    ),
  };
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

function IntegrationProviderCard({
  meta,
  integration,
  canManageIntegrations,
}: {
  meta: ProviderMeta;
  integration?: IntegrationConnection;
  canManageIntegrations: boolean;
}) {
  const connectMutation = useConnectIntegration(meta.provider);
  const disconnectMutation = useDisconnectIntegration(meta.provider);
  const testMutation = useTestIntegration(meta.provider);
  const pullSyncMutation = useStartPullSync(meta.provider);
  const pushSyncMutation = useStartPushSync(meta.provider);
  const updateConfigMutation = useUpdateIntegrationConfig(meta.provider);
  const jobsQuery = useIntegrationSyncJobs(meta.provider);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState<ProviderConfigForm>(() =>
    toFormConfig(integration),
  );

  useEffect(() => {
    setConfigForm(toFormConfig(integration));
  }, [integration?.updatedAt]);

  const status = integration?.status || "disconnected";
  const latestJob = jobsQuery.data?.data?.[0];
  const latestFailedJob = jobsQuery.data?.data?.find(
    (job) => job.status === "failed",
  );
  const lastError = integration?.lastError || latestFailedJob?.errorSummary || null;
  const connectedEmail =
    typeof integration?.config?.connectedEmail === "string"
      ? integration.config.connectedEmail
      : null;
  const calendarSummary =
    typeof integration?.config?.calendarSummary === "string"
      ? integration.config.calendarSummary
      : null;
  const calendarTimeZone =
    typeof integration?.config?.calendarTimeZone === "string"
      ? integration.config.calendarTimeZone
      : null;

  const isBusy =
    connectMutation.isPending ||
    disconnectMutation.isPending ||
    testMutation.isPending ||
    pullSyncMutation.isPending ||
    pushSyncMutation.isPending ||
    updateConfigMutation.isPending;

  const handleConnect = async () => {
    try {
      const result = await connectMutation.mutateAsync({
        redirectUri: window.location.href,
      });
      toast.success(`${meta.label} connection initialized`);
      if (result.authorizeUrl && result.authorizeUrl.startsWith("http")) {
        window.open(result.authorizeUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(`Failed to connect ${meta.label}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast.success(`${meta.label} disconnected`);
    } catch {
      toast.error(`Failed to disconnect ${meta.label}`);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testMutation.mutateAsync();
      if (result.result.ok) {
        toast.success(result.result.message);
      } else {
        toast.error(result.result.message);
      }
    } catch {
      toast.error(`Failed to test ${meta.label} connection`);
    }
  };

  const handlePullSync = async () => {
    try {
      const result = await pullSyncMutation.mutateAsync();
      toast.success(`Pull sync queued (${result.data.id.slice(0, 8)})`);
    } catch {
      toast.error(`Failed to queue pull sync for ${meta.label}`);
    }
  };

  const handlePushSync = async () => {
    try {
      const result = await pushSyncMutation.mutateAsync();
      toast.success(`Push sync queued (${result.data.id.slice(0, 8)})`);
    } catch {
      toast.error(`Failed to queue push sync for ${meta.label}`);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const config =
        meta.kind === "calendar"
          ? {
              followUpDurationMinutes: configForm.followUpDurationMinutes,
              slotIntervalMinutes: configForm.slotIntervalMinutes,
              availabilityWindowDays: configForm.availabilityWindowDays,
              minimumNoticeHours: configForm.minimumNoticeHours,
              workingHoursStart: configForm.workingHoursStart,
              workingHoursEnd: configForm.workingHoursEnd,
            }
          : {
              pullCustomers: configForm.pullCustomers,
              pullJobs: configForm.pullJobs,
              pushLeads: configForm.pushLeads,
              pushAppointments: configForm.pushAppointments,
              autoSync: configForm.autoSync,
              syncWindowDays: configForm.syncWindowDays,
            };

      await updateConfigMutation.mutateAsync({
        config,
      });
      setIsConfigModalOpen(false);
      toast.success(`${meta.label} configuration saved`);
    } catch {
      toast.error(`Failed to save ${meta.label} configuration`);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {meta.description}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.disconnected
            }`}
          >
            {status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {meta.kind === "calendar" ? "Connected Account" : "Last Sync"}
            </p>
            <p className="text-foreground mt-1">
              {meta.kind === "calendar"
                ? connectedEmail || "Not connected"
                : formatTimestamp(integration?.lastSyncAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {meta.kind === "calendar" ? "Calendar" : "Latest Job"}
            </p>
            <p className="text-foreground mt-1">
              {meta.kind === "calendar"
                ? calendarSummary || "Primary calendar"
                : latestJob
                  ? `${latestJob.direction.toUpperCase()} • ${latestJob.status}`
                  : "No sync jobs yet"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {meta.kind === "calendar" ? "Timezone" : "Updated"}
            </p>
            <p className="text-foreground mt-1">
              {meta.kind === "calendar"
                ? calendarTimeZone || "Default timezone"
                : formatTimestamp(integration?.updatedAt)}
            </p>
          </div>
        </div>

        {lastError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {lastError}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canManageIntegrations ? (
            <>
              {status === "connected" ? (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isBusy}
                  loading={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={isBusy}
                  loading={connectMutation.isPending}
                >
                  Connect
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isBusy}
                loading={testMutation.isPending}
              >
                Test Connection
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsConfigModalOpen(true)}
                disabled={isBusy}
              >
                Configure
              </Button>
              {meta.kind === "crm" && (
                <>
                  <Button
                    variant="outline"
                    onClick={handlePullSync}
                    disabled={isBusy || status !== "connected"}
                    loading={pullSyncMutation.isPending}
                  >
                    Pull Sync
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePushSync}
                    disabled={isBusy || status !== "connected"}
                    loading={pushSyncMutation.isPending}
                  >
                    Push Sync
                  </Button>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Members can view integration status but cannot manage credentials.
            </p>
          )}
        </div>
      </div>

      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`${meta.label} Configuration`}
        subtitle={
          meta.kind === "calendar"
            ? "Configure how the agent reads availability and schedules follow-up calls."
            : "Choose the sync behavior for this provider."
        }
      >
        <div className="space-y-4">
          {meta.kind === "calendar" ? (
            <>
              <label className="space-y-1 block">
                <span className="text-sm text-foreground">Follow-up call duration (minutes)</span>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={configForm.followUpDurationMinutes}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      followUpDurationMinutes: asNumber(
                        e.target.value,
                        defaultConfig.followUpDurationMinutes,
                      ),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm text-foreground">Availability search window (days)</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={configForm.availabilityWindowDays}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      availabilityWindowDays: asNumber(
                        e.target.value,
                        defaultConfig.availabilityWindowDays,
                      ),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1 block">
                  <span className="text-sm text-foreground">Workday start hour</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={configForm.workingHoursStart}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        workingHoursStart: asNumber(
                          e.target.value,
                          defaultConfig.workingHoursStart,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-sm text-foreground">Workday end hour</span>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={configForm.workingHoursEnd}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        workingHoursEnd: asNumber(
                          e.target.value,
                          defaultConfig.workingHoursEnd,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1 block">
                  <span className="text-sm text-foreground">Slot interval (minutes)</span>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={configForm.slotIntervalMinutes}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        slotIntervalMinutes: asNumber(
                          e.target.value,
                          defaultConfig.slotIntervalMinutes,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-sm text-foreground">Minimum notice (hours)</span>
                  <input
                    type="number"
                    min={0}
                    max={72}
                    value={configForm.minimumNoticeHours}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        minimumNoticeHours: asNumber(
                          e.target.value,
                          defaultConfig.minimumNoticeHours,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={configForm.pullCustomers}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      pullCustomers: e.target.checked,
                    }))
                  }
                />
                Pull customers
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={configForm.pullJobs}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, pullJobs: e.target.checked }))
                  }
                />
                Pull jobs/appointments
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={configForm.pushLeads}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, pushLeads: e.target.checked }))
                  }
                />
                Push leads
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={configForm.pushAppointments}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      pushAppointments: e.target.checked,
                    }))
                  }
                />
                Push appointments
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={configForm.autoSync}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, autoSync: e.target.checked }))
                  }
                />
                Auto-sync
              </label>
              <label className="space-y-1 block">
                <span className="text-sm text-foreground">Sync window (days)</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={configForm.syncWindowDays}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      syncWindowDays: asNumber(e.target.value, defaultConfig.syncWindowDays),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
              </label>
            </>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsConfigModalOpen(false)}
              disabled={updateConfigMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              loading={updateConfigMutation.isPending}
              disabled={updateConfigMutation.isPending}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function IntegrationsSettingsCard({
  canManageIntegrations,
}: IntegrationsSettingsCardProps) {
  const integrationsQuery = useIntegrations();

  const integrationByProvider = useMemo(() => {
    const map = new Map<IntegrationProvider, IntegrationConnection>();
    for (const integration of integrationsQuery.data?.data || []) {
      map.set(integration.provider, integration);
    }
    return map;
  }, [integrationsQuery.data?.data]);

  return (
    <Card title="Integrations">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage Google Calendar and CRM integrations, along with provider-specific connection settings.
        </p>

        {integrationsQuery.isLoading && !integrationsQuery.data ? (
          <div className="rounded-lg border border-border bg-card/70 px-4 py-6 text-sm text-muted-foreground">
            Loading integration status...
          </div>
        ) : integrationsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            Unable to load integrations. Refresh and try again.
          </div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((meta) => (
              <IntegrationProviderCard
                key={meta.provider}
                meta={meta}
                integration={integrationByProvider.get(meta.provider)}
                canManageIntegrations={canManageIntegrations}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
