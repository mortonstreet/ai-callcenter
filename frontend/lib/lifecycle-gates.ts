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

  const lifecycleStatusRaw = metadata.lifecycleStatus ?? nestedLifecycle.lifecycleStatus;
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
