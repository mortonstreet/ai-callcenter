import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLifecycleSnapshotFromOrganization,
  evaluateDashboardLifecycleGate,
} from "../lib/lifecycle-gates";

test("routes payment_required organizations to billing checkout gate", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization({
    id: "org_paid",
    metadata: {
      lifecycleStatus: "payment_required",
      planType: "paid",
      provisioningStatus: "completed",
    },
  });
  const decision = evaluateDashboardLifecycleGate("/dashboard/agents", snapshot);

  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, "/dashboard/billing");
});

test("keeps workspace_active users out of billing/provisioning gates", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization({
    id: "org_active",
    metadata: {
      lifecycleStatus: "workspace_active",
      planType: "paid",
      provisioningStatus: "completed",
      subscriptionStatus: "active",
    },
  });
  const decision = evaluateDashboardLifecycleGate("/dashboard/billing", snapshot);

  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, "/dashboard");
});

test("enforces demo policy before allowing demo bypass", () => {
  const unapproved = buildLifecycleSnapshotFromOrganization({
    id: "org_demo_unapproved",
    metadata: {
      lifecycleStatus: "demo_approved",
      planType: "demo",
      provisioningStatus: "running",
    },
  });
  assert.equal(unapproved.lifecycleStatus, "payment_required");

  const approved = buildLifecycleSnapshotFromOrganization({
    id: "org_demo_approved",
    metadata: {
      lifecycleStatus: "payment_required",
      planType: "demo",
      provisioningStatus: "running",
      demoPolicy: {
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });
  assert.equal(approved.lifecycleStatus, "demo_approved");
});

test("handles checkout return flow by staying on billing until verified", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization({
    id: "org_checkout_return",
    metadata: {
      lifecycleStatus: "payment_required",
      planType: "paid",
      provisioningStatus: "completed",
      subscriptionStatus: "incomplete",
    },
  });
  const decision = evaluateDashboardLifecycleGate("/dashboard/billing", snapshot);

  assert.equal(decision.allowed, true);
});
