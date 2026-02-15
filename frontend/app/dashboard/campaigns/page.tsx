"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Megaphone, Plus, Play, Pause, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/dashboard/Page";
import Button from "@/components/ui/Button";
import {
  Campaign,
  CampaignChannel,
  useActivateCampaign,
  useCampaignStats,
  useCampaigns,
  useCreateCampaign,
  useCreateCampaignStep,
  useDuplicateCampaign,
  usePauseCampaign,
} from "@/hooks/api/useCampaigns";

type CreationMode = "quick" | "multichannel";

type SequenceStep = {
  channel: CampaignChannel;
  offsetMinutes: number;
  template: string;
};

const channelLabels: Record<CampaignChannel, string> = {
  voice: "Voice",
  sms: "SMS",
  email: "Email",
};

const statusClasses: Record<Campaign["status"], string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  failed: "bg-rose-100 text-rose-700",
};

const buildDefaultSequence = (
  mode: CreationMode,
  quickChannel: CampaignChannel,
  selectedChannels: CampaignChannel[],
): SequenceStep[] => {
  if (mode === "quick") {
    return [
      {
        channel: quickChannel,
        offsetMinutes: 0,
        template: `Quick ${channelLabels[quickChannel]} follow-up`,
      },
    ];
  }

  const orderedChannels: CampaignChannel[] = ["sms", "email", "voice"];
  const offsetsByChannel: Record<CampaignChannel, number> = {
    sms: 0,
    email: 2 * 24 * 60,
    voice: 5 * 24 * 60,
  };

  return orderedChannels
    .filter((channel) => selectedChannels.includes(channel))
    .map((channel) => ({
      channel,
      offsetMinutes: offsetsByChannel[channel],
      template: `${channelLabels[channel]} step template`,
    }));
};

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

function CampaignListItem({
  campaign,
  onActivate,
  onPause,
  onDuplicate,
  isBusy,
}: {
  campaign: Campaign;
  onActivate: (campaignId: string) => Promise<void>;
  onPause: (campaignId: string) => Promise<void>;
  onDuplicate: (campaignId: string) => Promise<void>;
  isBusy: boolean;
}) {
  const { data: statsResponse } = useCampaignStats(campaign.id);
  const stats = statsResponse?.data;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{campaign.name}</h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[campaign.status]}`}
            >
              {campaign.status}
            </span>
          </div>
          {campaign.description && (
            <p className="mb-3 text-sm text-muted-foreground">{campaign.description}</p>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            {campaign.channels.map((channel) => (
              <span
                key={channel}
                className="rounded-md border border-border bg-accent px-2 py-1 text-xs font-medium text-foreground"
              >
                {channelLabels[channel]}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span>Leads enrolled: {stats?.totals.enrollments ?? 0}</span>
            <span>Steps: {campaign.steps.length}</span>
            <span>Recent activity: {formatTimestamp(campaign.updatedAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => onDuplicate(campaign.id)}
            disabled={isBusy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </Button>

          {campaign.status === "active" ? (
            <Button
              variant="outline"
              onClick={() => onPause(campaign.id)}
              disabled={isBusy}
              className="gap-2"
            >
              <Pause className="h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onActivate(campaign.id)}
              disabled={isBusy}
              className="gap-2"
            >
              <Play className="h-4 w-4" /> Activate
            </Button>
          )}

          <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Open <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>("quick");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quickChannel, setQuickChannel] = useState<CampaignChannel>("sms");
  const [selectedChannels, setSelectedChannels] = useState<CampaignChannel[]>([
    "sms",
    "email",
    "voice",
  ]);
  const [busyCampaignId, setBusyCampaignId] = useState<string | null>(null);

  const { data, isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const createStep = useCreateCampaignStep();
  const activateCampaign = useActivateCampaign();
  const pauseCampaign = usePauseCampaign();
  const duplicateCampaign = useDuplicateCampaign();

  const campaigns = data?.data || [];

  const createChannels = useMemo(() => {
    if (creationMode === "quick") {
      return [quickChannel];
    }

    return selectedChannels.length > 0 ? selectedChannels : ["sms"];
  }, [creationMode, quickChannel, selectedChannels]);

  const toggleChannel = (channel: CampaignChannel) => {
    setSelectedChannels((previous) => {
      if (previous.includes(channel)) {
        return previous.filter((current) => current !== channel);
      }
      return [...previous, channel];
    });
  };

  const resetCreateForm = () => {
    setName("");
    setDescription("");
    setCreationMode("quick");
    setQuickChannel("sms");
    setSelectedChannels(["sms", "email", "voice"]);
  };

  const handleCreateCampaign = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Campaign name is required");
      return;
    }

    try {
      const created = await createCampaign.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
        channels: createChannels,
        allowMemberEnrollment: true,
      });

      const steps = buildDefaultSequence(
        creationMode,
        quickChannel,
        createChannels,
      );

      for (const step of steps) {
        await createStep.mutateAsync({
          campaignId: created.data.id,
          channel: step.channel,
          offsetMinutes: step.offsetMinutes,
          template: step.template,
          skipIfReplied: true,
          skipIfBooked: true,
        });
      }

      toast.success("Campaign created");
      resetCreateForm();
      setShowCreate(false);
    } catch {
      toast.error("Failed to create campaign");
    }
  };

  const withCampaignAction = async (
    campaignId: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setBusyCampaignId(campaignId);
    try {
      await action();
      toast.success(successMessage);
    } catch {
      toast.error("Campaign action failed");
    } finally {
      setBusyCampaignId(null);
    }
  };

  return (
    <Page
      title="Campaigns"
      subtitle="Run multichannel outreach across voice, SMS, and email"
      actions={
        <Button className="gap-2" onClick={() => setShowCreate((previous) => !previous)}>
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      }
    >
      {showCreate && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Create campaign</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-foreground">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Spring tune-up reminder"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-foreground">Description</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Seasonal maintenance follow-up"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-border p-3">
            <p className="mb-2 text-sm font-medium text-foreground">Creation mode</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreationMode("quick")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  creationMode === "quick"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-foreground"
                }`}
              >
                Quick start
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("multichannel")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  creationMode === "multichannel"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-foreground"
                }`}
              >
                Multichannel sequence
              </button>
            </div>

            {creationMode === "quick" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(["voice", "sms", "email"] as CampaignChannel[]).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setQuickChannel(channel)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      quickChannel === channel
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {channelLabels[channel]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(["voice", "sms", "email"] as CampaignChannel[]).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      selectedChannels.includes(channel)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {channelLabels[channel]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={handleCreateCampaign}
              loading={createCampaign.isPending || createStep.isPending}
            >
              Create campaign
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreate(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-foreground">No campaigns yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create a quick campaign or build a multichannel sequence to get started.
          </p>
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create first campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignListItem
              key={campaign.id}
              campaign={campaign}
              isBusy={busyCampaignId === campaign.id}
              onActivate={(currentCampaignId) =>
                withCampaignAction(
                  currentCampaignId,
                  async () => {
                    await activateCampaign.mutateAsync(currentCampaignId);
                  },
                  "Campaign activated",
                )
              }
              onPause={(currentCampaignId) =>
                withCampaignAction(
                  currentCampaignId,
                  async () => {
                    await pauseCampaign.mutateAsync(currentCampaignId);
                  },
                  "Campaign paused",
                )
              }
              onDuplicate={(currentCampaignId) =>
                withCampaignAction(
                  currentCampaignId,
                  async () => {
                    await duplicateCampaign.mutateAsync(currentCampaignId);
                  },
                  "Campaign duplicated",
                )
              }
            />
          ))}
        </div>
      )}
    </Page>
  );
}
