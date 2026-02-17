export const ORG_LIFECYCLE_STATUSES = [
  "onboarding_incomplete",
  "payment_required",
  "demo_approved",
  "provisioning_pending",
  "workspace_active",
  "suspended",
] as const;

export const ORG_PLAN_TYPES = ["paid", "demo"] as const;

export const ORG_PROVISIONING_STATUSES = [
  "pending",
  "running",
  "failed",
  "completed",
] as const;

type BillingEntitlementState =
  | "payment_required"
  | "payment_verified"
  | "restricted"
  | "demo_bypass";

const BILLING_ENTITLEMENT_STATES = [
  "payment_required",
  "payment_verified",
  "restricted",
  "demo_bypass",
] as const;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const RESTRICTED_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
]);

export type OrganizationLifecycleStatus = (typeof ORG_LIFECYCLE_STATUSES)[number];
export type OrganizationPlanType = (typeof ORG_PLAN_TYPES)[number];
export type OrganizationProvisioningStatus =
  (typeof ORG_PROVISIONING_STATUSES)[number];

export type OrganizationLifecycleSnapshot = {
  organizationId: string | null;
  lifecycleStatus: OrganizationLifecycleStatus;
  planType: OrganizationPlanType;
  provisioningStatus: OrganizationProvisioningStatus;
};

export type DashboardLifecycleDecision = {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
};

const isLifecycleStatus = (value: unknown): value is OrganizationLifecycleStatus =>
  typeof value === "string" &&
  ORG_LIFECYCLE_STATUSES.includes(value as OrganizationLifecycleStatus);

const isPlanType = (value: unknown): value is OrganizationPlanType =>
  typeof value === "string" && ORG_PLAN_TYPES.includes(value as OrganizationPlanType);

const isProvisioningStatus = (
  value: unknown,
): value is OrganizationProvisioningStatus =>
  typeof value === "string" &&
  ORG_PROVISIONING_STATUSES.includes(value as OrganizationProvisioningStatus);

const isBillingEntitlementState = (
  value: unknown,
): value is BillingEntitlementState =>
  typeof value === "string" &&
  BILLING_ENTITLEMENT_STATES.includes(value as BillingEntitlementState);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parseMetadata = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
};

const parseOptionalDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isDemoPolicyApproved = (
  metadata: Record<string, unknown>,
  now: Date = new Date(),
) => {
  const demoPolicy = isRecord(metadata.demoPolicy) ? metadata.demoPolicy : {};
  const approvedAt = parseOptionalDate(
    demoPolicy.approvedAt ?? demoPolicy.approved_at,
  );
  if (!approvedAt) return false;

  const suspendedAt = parseOptionalDate(
    demoPolicy.suspendedAt ?? demoPolicy.suspended_at,
  );
  if (suspendedAt && suspendedAt <= now) return false;

  const expiresAt = parseOptionalDate(
    demoPolicy.expiresAt ?? demoPolicy.expires_at,
  );
  if (expiresAt && expiresAt <= now) return false;

  return true;
};

const mapSubscriptionStatusToEntitlementState = (
  subscriptionStatus: string | null,
): BillingEntitlementState | null => {
  if (!subscriptionStatus) return null;
  const normalized = subscriptionStatus.toLowerCase().trim();
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(normalized)) {
    return "payment_verified";
  }
  if (RESTRICTED_SUBSCRIPTION_STATUSES.has(normalized)) {
    return "restricted";
  }
  return "payment_required";
};

const extractEntitlementSignals = (metadata: Record<string, unknown>) => {
  const billing = isRecord(metadata.billing) ? metadata.billing : {};
  const entitlementRaw = metadata.entitlementState ?? billing.entitlementState;
  const subscriptionStatusRaw =
    metadata.subscriptionStatus ?? billing.subscriptionStatus;

  const entitlementState = isBillingEntitlementState(entitlementRaw)
    ? entitlementRaw
    : null;
  const subscriptionStatus =
    typeof subscriptionStatusRaw === "string" &&
    subscriptionStatusRaw.trim().length > 0
      ? subscriptionStatusRaw.trim()
      : null;

  const hasBillingSignal =
    entitlementState !== null ||
    subscriptionStatus !== null ||
    typeof metadata.billingOffer === "string" ||
    typeof billing.offer === "string";

  return {
    entitlementState,
    subscriptionStatus,
    hasBillingSignal,
  };
};

export const buildLifecycleSnapshotFromOrganization = (
  organization: { id?: string | null; metadata?: unknown } | null | undefined,
): OrganizationLifecycleSnapshot => {
  if (!organization?.id) {
    return {
      organizationId: null,
      lifecycleStatus: "onboarding_incomplete",
      planType: "paid",
      provisioningStatus: "pending",
    };
  }

  const metadata = parseMetadata(organization.metadata);
  const lifecycle = metadata.lifecycle;
  const nestedLifecycle =
    lifecycle && typeof lifecycle === "object"
      ? (lifecycle as Record<string, unknown>)
      : {};

  const lifecycleStatusRaw =
    metadata.lifecycleStatus ?? nestedLifecycle.lifecycleStatus;
  const planTypeRaw = metadata.planType ?? nestedLifecycle.planType;
  const provisioningStatusRaw =
    metadata.provisioningStatus ?? nestedLifecycle.provisioningStatus;

  const planType = isPlanType(planTypeRaw) ? planTypeRaw : "paid";
  const provisioningStatus = isProvisioningStatus(provisioningStatusRaw)
    ? provisioningStatusRaw
    : "completed";

  let lifecycleStatus: OrganizationLifecycleStatus = "workspace_active";
  if (isLifecycleStatus(lifecycleStatusRaw)) {
    lifecycleStatus = lifecycleStatusRaw;
  } else if (provisioningStatus === "pending" || provisioningStatus === "running") {
    lifecycleStatus = "provisioning_pending";
  }

  const entitlementSignals = extractEntitlementSignals(metadata);
  const hasExplicitLifecycle = isLifecycleStatus(lifecycleStatusRaw);
  const shouldApplyEntitlementRules =
    hasExplicitLifecycle || entitlementSignals.hasBillingSignal;

  if (planType === "demo") {
    const demoPolicyApproved = isDemoPolicyApproved(metadata);
    if (demoPolicyApproved && lifecycleStatus === "payment_required") {
      lifecycleStatus = "demo_approved";
    } else if (
      !demoPolicyApproved &&
      (lifecycleStatus === "demo_approved" || lifecycleStatus === "workspace_active")
    ) {
      lifecycleStatus = "payment_required";
    }
  } else if (shouldApplyEntitlementRules) {
    const entitlementState =
      entitlementSignals.entitlementState ||
      mapSubscriptionStatusToEntitlementState(entitlementSignals.subscriptionStatus);

    if (entitlementState === "restricted") {
      lifecycleStatus = "suspended";
    } else if (entitlementState === "payment_required") {
      if (lifecycleStatus !== "onboarding_incomplete") {
        lifecycleStatus = "payment_required";
      }
    } else if (entitlementState === "payment_verified") {
      if (lifecycleStatus !== "onboarding_incomplete") {
        lifecycleStatus =
          provisioningStatus === "pending" || provisioningStatus === "running"
            ? "provisioning_pending"
            : "workspace_active";
      }
    }
  }

  return {
    organizationId: organization.id,
    lifecycleStatus,
    planType,
    provisioningStatus,
  };
};

const REQUIRED_ROUTE_BY_STATUS: Partial<Record<OrganizationLifecycleStatus, string>> = {
  onboarding_incomplete: "/onboarding",
  payment_required: "/dashboard/billing",
  demo_approved: "/dashboard/provisioning",
  provisioning_pending: "/dashboard/provisioning",
  suspended: "/dashboard/billing",
};

export const getRequiredClientRouteForStatus = (
  status: OrganizationLifecycleStatus,
): string | null => REQUIRED_ROUTE_BY_STATUS[status] || null;

export const evaluateDashboardLifecycleGate = (
  pathname: string,
  snapshot: OrganizationLifecycleSnapshot,
): DashboardLifecycleDecision => {
  const requiredRoute = getRequiredClientRouteForStatus(snapshot.lifecycleStatus);
  if (!requiredRoute) {
    if (
      pathname.startsWith("/dashboard/billing") ||
      pathname.startsWith("/dashboard/provisioning")
    ) {
      return {
        allowed: false,
        redirectTo: "/dashboard",
        reason: "Lifecycle requirements are complete.",
      };
    }
    return { allowed: true };
  }

  if (requiredRoute === "/onboarding") {
    return {
      allowed: false,
      redirectTo: "/onboarding",
      reason: "Organization onboarding is required.",
    };
  }

  if (pathname === requiredRoute || pathname.startsWith(`${requiredRoute}/`)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    redirectTo: requiredRoute,
    reason: `Organization lifecycle status "${snapshot.lifecycleStatus}" requires ${requiredRoute}.`,
  };
};
