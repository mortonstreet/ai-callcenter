"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, X, Check, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/dashboard/Page";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLead, useUpdateLead, useDeleteLead } from "@/hooks/api/useLeads";
import { usePipelineStages } from "@/hooks/api/usePipeline";
import { toast } from "sonner";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: lead, isLoading } = useLead(id);
  const { data: stagesData } = usePipelineStages();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    company: "",
    title: "",
    linkedInUrl: "",
    website: "",
    dealValue: "",
  });

  useEffect(() => {
    if (lead) {
      setForm({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        phone: lead.phone || "",
        email: lead.email || "",
        company: lead.company || "",
        title: lead.title || "",
        linkedInUrl: lead.linkedInUrl || "",
        website: lead.website || "",
        dealValue: lead.dealValue ? String(Number(lead.dealValue)) : "",
      });
    }
  }, [lead]);

  const stages = stagesData?.data || [];

  const handleSave = async () => {
    try {
      await updateLead.mutateAsync({
        id,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        company: form.company,
        title: form.title,
        linkedInUrl: form.linkedInUrl,
        website: form.website,
        dealValue: form.dealValue ? Number(form.dealValue) : undefined,
      });
      toast.success("Lead updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update lead");
    }
  };

  const handleStageChange = async (stageId: string) => {
    try {
      await updateLead.mutateAsync({
        id,
        pipelineStageId: stageId || null,
      });
      toast.success("Pipeline stage updated");
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this lead? This action cannot be undone.")) return;
    try {
      await deleteLead.mutateAsync(id);
      toast.success("Lead deleted");
      router.push("/dashboard/leads");
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isLoading) {
    return (
      <Page title="Lead">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </Page>
    );
  }

  if (!lead) {
    return (
      <Page title="Lead">
        <div className="text-center py-12 text-muted-foreground">Lead not found.</div>
      </Page>
    );
  }

  const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed Lead";

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Back link */}
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground">
            {displayName}
          </h1>
          {lead.company && (
            <p className="text-muted-foreground mt-1">
              {lead.title ? `${lead.title} at ` : ""}{lead.company}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-1">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} loading={updateLead.isPending} className="gap-1">
                <Check className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button variant="ghost" onClick={handleDelete} className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="First Name" value={form.firstName} onChange={set("firstName")} />
                <Input label="Last Name" value={form.lastName} onChange={set("lastName")} />
              </div>
              <Input label="Phone" value={form.phone} onChange={set("phone")} />
              <Input label="Email" type="email" value={form.email} onChange={set("email")} />
              <Input label="Company" value={form.company} onChange={set("company")} />
              <Input label="Title" value={form.title} onChange={set("title")} />
              <Input label="LinkedIn URL" value={form.linkedInUrl} onChange={set("linkedInUrl")} />
              <Input label="Website" value={form.website} onChange={set("website")} />
              <Input label="Deal Value ($)" type="number" value={form.dealValue} onChange={set("dealValue")} min="0" step="0.01" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <Field label="Phone" value={lead.phone} />
              <Field label="Email" value={lead.email} />
              <Field label="Company" value={lead.company} />
              <Field label="Title" value={lead.title} />
              <Field label="LinkedIn" value={lead.linkedInUrl} link />
              <Field label="Website" value={lead.website} link />
              <Field
                label="Deal Value"
                value={lead.dealValue ? `$${Number(lead.dealValue).toLocaleString()}` : null}
              />
            </div>
          )}
        </div>

        {/* Side cards */}
        <div className="space-y-6">
          {/* Pipeline Stage */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Pipeline Stage</h2>
            <select
              value={lead.pipelineStageId || ""}
              onChange={(e) => handleStageChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition"
            >
              <option value="">No stage</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            {lead.pipelineStageId && stages.length > 0 && (() => {
              const stage = stages.find((s) => s.id === lead.pipelineStageId);
              return stage ? (
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm text-foreground">{stage.label}</span>
                </div>
              ) : null;
            })()}
          </div>

          {/* Created Date */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Created</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(lead.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(lead.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      {value ? (
        link ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <div className="text-sm text-foreground">{value}</div>
        )
      ) : (
        <div className="text-sm text-muted-foreground/50">—</div>
      )}
    </div>
  );
}
