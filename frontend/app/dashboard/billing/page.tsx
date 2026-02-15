import Link from "next/link";

export default function DashboardBillingGatePage() {
  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-foreground">Billing required</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Your organization needs an active billing setup before full workspace access is enabled.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open settings
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
