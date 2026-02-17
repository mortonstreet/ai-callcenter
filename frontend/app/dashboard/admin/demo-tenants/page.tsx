import Link from "next/link";
import { Page } from "@/components/dashboard/Page";

export default function DemoTenantsPage() {
  return (
    <Page
      title="Demo Tenants"
      subtitle="Workspace demo tenant tools are not enabled in this deployment yet."
    >
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <p>This route now resolves correctly.</p>
        <p className="mt-2">
          Demo tenant management UI can be added here when the backend contract is ready.
        </p>
        <Link
          href="/dashboard/admin"
          className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-foreground hover:bg-muted/30"
        >
          Back to Admin
        </Link>
      </div>
    </Page>
  );
}
