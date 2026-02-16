"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AdminDemoTenant,
  useAdminApproveDemoTenant,
  useAdminConvertDemoTenant,
  useAdminCreateDemoTenant,
  useAdminDemoTenants,
  useAdminExtendDemoTenant,
  useAdminHandoffDemoTenantOwner,
  useAdminSuspendDemoTenant,
} from "@/hooks/api/useAdmin";

const toIsoOrNull = (value: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const fmt = (value: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const statusTone = (status: AdminDemoTenant["status"]) => {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "expired":
      return "bg-amber-100 text-amber-800";
    case "suspended":
      return "bg-rose-100 text-rose-800";
    case "converted":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
};

export default function AdminDemoTenantsPage() {
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  const { data, isLoading } = useAdminDemoTenants();
  const createMutation = useAdminCreateDemoTenant();
  const approveMutation = useAdminApproveDemoTenant();
  const extendMutation = useAdminExtendDemoTenant();
  const suspendMutation = useAdminSuspendDemoTenant();
  const convertMutation = useAdminConvertDemoTenant();
  const handoffMutation = useAdminHandoffDemoTenantOwner();

  const tenants = useMemo(() => data?.data || [], [data]);

  const isMutating =
    createMutation.isPending ||
    approveMutation.isPending ||
    extendMutation.isPending ||
    suspendMutation.isPending ||
    convertMutation.isPending ||
    handoffMutation.isPending;

  const onCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !ownerEmail.trim()) {
      toast.error("Name and owner email are required");
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerName: ownerName.trim() || undefined,
        expiresAt: toIsoOrNull(expiresAt),
        approvalNotes: approvalNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setOwnerEmail("");
          setOwnerName("");
          setExpiresAt("");
          setApprovalNotes("");
          toast.success("Demo tenant created");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Create failed");
        },
      },
    );
  };

  const handleApprove = (tenant: AdminDemoTenant) => {
    const defaultExpiry = tenant.expiresAt
      ? new Date(tenant.expiresAt).toISOString().slice(0, 16)
      : "";
    const promptedExpiry = window.prompt(
      "Approval expiry (ISO or yyyy-mm-ddThh:mm)",
      defaultExpiry,
    );
    if (promptedExpiry === null) return;

    const expiryIso = toIsoOrNull(promptedExpiry);
    if (!expiryIso) {
      toast.error("Provide a valid expiry datetime");
      return;
    }

    const approvalNotesInput = window.prompt(
      "Approval note (optional)",
      "",
    );

    approveMutation.mutate(
      {
        organizationId: tenant.organizationId,
        expiresAt: expiryIso,
        approvalNotes: approvalNotesInput?.trim() || undefined,
      },
      {
        onSuccess: () => toast.success("Demo tenant approved"),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Approve failed");
        },
      },
    );
  };

  const handleExtend = (tenant: AdminDemoTenant) => {
    const promptedExpiry = window.prompt(
      "New expiry (ISO or yyyy-mm-ddThh:mm)",
      tenant.expiresAt ? new Date(tenant.expiresAt).toISOString().slice(0, 16) : "",
    );
    if (promptedExpiry === null) return;

    const expiryIso = toIsoOrNull(promptedExpiry);
    if (!expiryIso) {
      toast.error("Provide a valid expiry datetime");
      return;
    }

    const reason = window.prompt("Extension reason", "Customer success extension");
    if (!reason || reason.trim().length < 3) {
      toast.error("Extension reason is required");
      return;
    }

    extendMutation.mutate(
      {
        organizationId: tenant.organizationId,
        expiresAt: expiryIso,
        extensionReason: reason.trim(),
      },
      {
        onSuccess: () => toast.success("Demo tenant extended"),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Extend failed");
        },
      },
    );
  };

  const handleSuspend = (tenant: AdminDemoTenant) => {
    const reason = window.prompt("Suspension reason", "Demo misuse");
    if (!reason || reason.trim().length < 3) {
      toast.error("Suspension reason is required");
      return;
    }

    suspendMutation.mutate(
      {
        organizationId: tenant.organizationId,
        reason: reason.trim(),
      },
      {
        onSuccess: () => toast.success("Demo tenant suspended"),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Suspend failed");
        },
      },
    );
  };

  const handleConvert = (tenant: AdminDemoTenant) => {
    const confirmed = window.confirm(
      `Convert ${tenant.name} to paid and require billing checkout?`,
    );
    if (!confirmed) return;

    const reason = window.prompt("Conversion reason (optional)", "Owner handoff complete");

    convertMutation.mutate(
      {
        organizationId: tenant.organizationId,
        reason: reason?.trim() || undefined,
      },
      {
        onSuccess: () => toast.success("Demo tenant converted to paid"),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Convert failed");
        },
      },
    );
  };

  const handleHandoff = (tenant: AdminDemoTenant) => {
    const email = window.prompt("Owner email for handoff", tenant.ownerEmail || "");
    if (!email || !email.includes("@")) {
      toast.error("Valid owner email is required");
      return;
    }

    const nameInput = window.prompt("Owner display name (optional)", tenant.ownerName || "");

    handoffMutation.mutate(
      {
        organizationId: tenant.organizationId,
        ownerEmail: email.trim(),
        ownerName: nameInput?.trim() || undefined,
        role: "owner",
      },
      {
        onSuccess: (result) => {
          if (result.invitationId) {
            toast.success("Owner invitation sent for handoff");
          } else {
            toast.success("Owner handoff completed");
          }
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Handoff failed");
        },
      },
    );
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Demo Tenant Provisioning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create demo orgs, approve policy windows, and handoff owner access.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Admin
        </Link>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Organization name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Acme Demo Workspace"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Owner email</span>
            <input
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="owner@example.com"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Owner name</span>
            <input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Initial expiry</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-sm font-medium text-foreground">Approval notes</span>
          <textarea
            value={approvalNotes}
            onChange={(event) => setApprovalNotes(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={2}
            placeholder="Optional context for this demo request"
          />
        </label>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "Create Demo Tenant"}
        </button>
      </form>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Demo Tenants</h2>
          <span className="text-xs text-muted-foreground">{tenants.length} total</span>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading demo tenants...</div>
        ) : tenants.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No demo tenants found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Organization</th>
                  <th className="text-left px-4 py-2">Owner</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Expiry</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.organizationId} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">{tenant.organizationId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{tenant.ownerEmail || "-"}</div>
                      <div className="text-xs text-muted-foreground">{tenant.ownerName || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusTone(tenant.status)}`}>
                        {tenant.status.replace("_", " ")}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        Lifecycle: {tenant.lifecycleStatus}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{fmt(tenant.expiresAt)}</div>
                      <div className="text-xs text-muted-foreground">Approved: {fmt(tenant.approvedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={isMutating || tenant.status === "converted"}
                          onClick={() => handleApprove(tenant)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={isMutating || tenant.status === "converted"}
                          onClick={() => handleExtend(tenant)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          Extend
                        </button>
                        <button
                          disabled={isMutating || tenant.status === "converted"}
                          onClick={() => handleSuspend(tenant)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          Suspend
                        </button>
                        <button
                          disabled={isMutating || tenant.status === "converted"}
                          onClick={() => handleHandoff(tenant)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          Handoff
                        </button>
                        <button
                          disabled={isMutating || tenant.status === "converted"}
                          onClick={() => handleConvert(tenant)}
                          className="rounded border border-amber-200 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                          Convert
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
