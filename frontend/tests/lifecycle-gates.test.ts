import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLifecycleSnapshotFromOrganization,
  evaluateDashboardLifecycleGate,
} from "../lib/lifecycle-gates.ts";

test("defaults to onboarding_incomplete when organization is missing", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization(null);
  assert.equal(snapshot.lifecycleStatus, "onboarding_incomplete");
});

test("routes onboarding_incomplete users away from dashboard routes", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization(null);
  const decision = evaluateDashboardLifecycleGate("/dashboard", snapshot);

  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, "/onboarding");
});

test("routes payment_required users to dashboard billing gate", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization({
    id: "org_1",
    metadata: JSON.stringify({
      lifecycleStatus: "payment_required",
      planType: "paid",
      provisioningStatus: "completed",
    }),
  });
  const decision = evaluateDashboardLifecycleGate("/dashboard/agents", snapshot);

  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, "/dashboard/billing");
});

test("allows provisioning route when status requires provisioning", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization({
    id: "org_1",
    metadata: {
      lifecycleStatus: "provisioning_pending",
      provisioningStatus: "running",
    },
  });
  const decision = evaluateDashboardLifecycleGate(
    "/dashboard/provisioning",
    snapshot,
  );

  assert.equal(decision.allowed, true);
});

test("keeps workspace_active users out of gate pages", () => {
  const snapshot = buildLifecycleSnapshotFromOrganization({
    id: "org_1",
    metadata: {
      lifecycleStatus: "workspace_active",
      planType: "paid",
      provisioningStatus: "completed",
    },
  });
  const decision = evaluateDashboardLifecycleGate(
    "/dashboard/provisioning",
    snapshot,
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, "/dashboard");
});
