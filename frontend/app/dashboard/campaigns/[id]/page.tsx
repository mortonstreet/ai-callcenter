"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/dashboard/Page";
import Button from "@/components/ui/Button";
import {
  CampaignChannel,
  useCampaign,
  useCampaignEnrollments,
  useCampaignEvents,
  useCampaignStats,
  useCreateCampaignEnrollment,
  useCreateCampaignEnrollmentsFromList,
  useCreateCampaignStep,
} from "@/hooks/api/useCampaigns";

type CampaignTab = "voice" | "sms" | "email" | "performance";

const channelTabs: { key: CampaignTab; label: string }[] = [
  { key: "voice", label: "Voice" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
  { key: "performance", label: "Performance" },
];

const channelLabels: Record<CampaignChannel, string> = {
  voice: "Voice",
  sms: "SMS",
  email: "Email",
};

const formatTimestamp = (iso: string | null | undefined) => {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = typeof params?.id === "string" ? params.id : "";

  const [activeTab, setActiveTab] = useState<CampaignTab>("voice");
  const [newStepTemplate, setNewStepTemplate] = useState("");
  const [newStepOffsetDays, setNewStepOffsetDays] = useState("0");
  const [leadId, setLeadId] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [listId, setListId] = useState("");
  const [listLeadIdsRaw, setListLeadIdsRaw] = useState("");

  const { data: campaignResponse, isLoading: isLoadingCampaign } =
    useCampaign(campaignId);
  const { data: statsResponse } = useCampaignStats(campaignId);
  const { data: enrollmentsResponse } = useCampaignEnrollments(campaignId);
  const { data: eventsResponse } = useCampaignEvents(campaignId, 50);

  const createStep = useCreateCampaignStep();
  const createEnrollment = useCreateCampaignEnrollment();
  const createEnrollmentsFromList = useCreateCampaignEnrollmentsFromList();

  const campaign = campaignResponse?.data;
  const stats = statsResponse?.data;
  const enrollments = enrollmentsResponse?.data || [];
  const events = eventsResponse?.data || [];

  const activeChannel =
    activeTab === "performance" ? null : (activeTab as CampaignChannel);

  const channelSteps = useMemo(() => {
    if (!campaign || !activeChannel) {
      return [];
    }

    return campaign.steps
      .filter((step) => step.channel === activeChannel)
      .sort((first, second) => first.offsetMinutes - second.offsetMinutes);
  }, [activeChannel, campaign]);

  const handleAddStep = async () => {
    if (!campaignId || !activeChannel) {
      return;
    }

    const trimmedTemplate = newStepTemplate.trim();
    if (!trimmedTemplate) {
      toast.error("Step template is required");
      return;
    }

    const offsetDays = Number(newStepOffsetDays || "0");
    const offsetMinutes = Number.isFinite(offsetDays)
      ? Math.max(0, Math.floor(offsetDays * 24 * 60))
      : 0;

    try {
      await createStep.mutateAsync({
        campaignId,
        channel: activeChannel,
        offsetMinutes,
        template: trimmedTemplate,
        skipIfReplied: true,
        skipIfBooked: true,
      });

      setNewStepTemplate("");
      setNewStepOffsetDays("0");
      toast.success(`${channelLabels[activeChannel]} step added`);
    } catch {
      toast.error("Failed to add step");
    }
  };

  const handleManualEnrollment = async (event: FormEvent) => {
    event.preventDefault();

    if (!campaignId || !leadId.trim()) {
      toast.error("Lead ID is required");
      return;
    }

    try {
      await createEnrollment.mutateAsync({
        campaignId,
        leadId: leadId.trim(),
        contact: {
          name: leadName.trim() || undefined,
          phone: leadPhone.trim() || undefined,
          email: leadEmail.trim() || undefined,
        },
      });

      setLeadId("");
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      toast.success("Lead enrolled");
    } catch {
      toast.error("Failed to enroll lead");
    }
  };

  const handleListEnrollment = async (event: FormEvent) => {
    event.preventDefault();

    if (!campaignId || !listId.trim()) {
      toast.error("List ID is required");
      return;
    }

    const leadIds = listLeadIdsRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      await createEnrollmentsFromList.mutateAsync({
        campaignId,
        listId: listId.trim(),
        leadIds,
      });

      setListLeadIdsRaw("");
      toast.success("List enrollment started");
    } catch {
      toast.error("Failed to import list enrollments");
    }
  };

  if (isLoadingCampaign) {
    return (
      <Page title="Campaign" subtitle="Loading campaign details...">
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading campaign...
        </div>
      </Page>
    );
  }

  if (!campaign) {
    return (
      <Page title="Campaign" subtitle="Campaign not found">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            This campaign could not be found in your active organization.
          </p>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to campaigns
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={campaign.name}
      subtitle={`Status: ${campaign.status} • Channels: ${campaign.channels
        .map((channel) => channelLabels[channel])
        .join(", ")}`}
      actions={
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Enrolled</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {stats?.totals.enrollments ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Replied</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {stats?.totals.replied ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Unsubscribed</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {stats?.totals.unsubscribed ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Failures</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {stats?.totals.failed ?? 0}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
        {channelTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-foreground hover:opacity-90"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "performance" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Channel mix</h2>
            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span>Voice: {stats?.channelMix.voice ?? 0}</span>
              <span>SMS: {stats?.channelMix.sms ?? 0}</span>
              <span>Email: {stats?.channelMix.email ?? 0}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Recent events</h2>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaign events yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">{entry.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {channelLabels[activeChannel as CampaignChannel]} sequence
              </h2>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_auto]">
              <input
                value={newStepTemplate}
                onChange={(event) => setNewStepTemplate(event.target.value)}
                placeholder="Template or script"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              />
              <input
                value={newStepOffsetDays}
                onChange={(event) => setNewStepOffsetDays(event.target.value)}
                type="number"
                min="0"
                step="1"
                placeholder="Offset days"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              />
              <Button
                className="gap-2"
                onClick={handleAddStep}
                loading={createStep.isPending}
              >
                <Plus className="h-4 w-4" /> Add step
              </Button>
            </div>

            {channelSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {channelLabels[activeChannel as CampaignChannel]} steps yet.
              </p>
            ) : (
              <div className="space-y-2">
                {channelSteps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">{step.template}</p>
                    <p className="text-xs text-muted-foreground">
                      Offset: {Math.floor(step.offsetMinutes / 60 / 24)} day(s) • Updated {" "}
                      {formatTimestamp(step.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <form
              onSubmit={handleManualEnrollment}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <h2 className="mb-3 text-lg font-semibold text-foreground">Manual enrollment</h2>
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={leadId}
                  onChange={(event) => setLeadId(event.target.value)}
                  placeholder="Lead ID"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                />
                <input
                  value={leadName}
                  onChange={(event) => setLeadName(event.target.value)}
                  placeholder="Lead name"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                />
                <input
                  value={leadPhone}
                  onChange={(event) => setLeadPhone(event.target.value)}
                  placeholder="Phone"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                />
                <input
                  value={leadEmail}
                  onChange={(event) => setLeadEmail(event.target.value)}
                  placeholder="Email"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button
                className="mt-3"
                type="submit"
                loading={createEnrollment.isPending}
              >
                Enroll lead
              </Button>
            </form>

            <form
              onSubmit={handleListEnrollment}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <h2 className="mb-3 text-lg font-semibold text-foreground">Import from list</h2>
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={listId}
                  onChange={(event) => setListId(event.target.value)}
                  placeholder="List ID"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                />
                <textarea
                  value={listLeadIdsRaw}
                  onChange={(event) => setListLeadIdsRaw(event.target.value)}
                  placeholder="Lead IDs (comma separated)"
                  rows={4}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button
                className="mt-3 gap-2"
                type="submit"
                loading={createEnrollmentsFromList.isPending}
              >
                <Upload className="h-4 w-4" /> Import enrollments
              </Button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Enrollments</h2>
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads enrolled yet.</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm sm:grid-cols-4"
              >
                <span className="font-medium text-foreground">{enrollment.leadId}</span>
                <span className="text-muted-foreground">{enrollment.status}</span>
                <span className="text-muted-foreground">
                  {enrollment.contact.email || enrollment.contact.phone || "No contact"}
                </span>
                <span className="text-muted-foreground">
                  {formatTimestamp(enrollment.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
