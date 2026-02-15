import Link from "next/link";

export default function DashboardProvisioningGatePage() {
  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-foreground">Provisioning in progress</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Your organization is still being prepared. Full dashboard access will be enabled when provisioning completes.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Refresh status
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
