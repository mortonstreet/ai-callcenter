// app/dashboard/layout.tsx
"use client";
import Sidebar from "@/components/dashboard/Sidebar";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useOrganizations,
} from "@/hooks/api/useOrganization";
import { useActiveOrganization } from "@/lib/auth-client";
import { DBUser } from "@/lib/shared-types";
import { PanelLeft, PanelLeftClose, ChevronDown, LogOut, Plus, ChevronRight } from "lucide-react";
import { useEffectiveOrganization } from "@/lib/admin-store";
import { useAdminOrganizations } from "@/hooks/api/useAdmin";
import { useAdminStore } from "@/lib/admin-store";
import { useSetActiveOrganizationMutation } from "@/hooks/api/useOrganization";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { DialerProvider } from "@/components/providers/DialerProvider";
import { GlobalIncomingCallBanner } from "@/components/dialer/GlobalIncomingCallBanner";
import {
  buildLifecycleSnapshotFromOrganization,
  evaluateDashboardLifecycleGate,
} from "@/lib/lifecycle-gates";

// Map route paths to page names
const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/agents": "Agents",
  "/dashboard/tasks": "Leads",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/schedule": "Schedule",
  "/dashboard/pipeline": "Pipeline",
  "/dashboard/recordings": "Recordings",
  "/dashboard/settings": "Settings",
  "/dashboard/billing": "Billing",
  "/dashboard/provisioning": "Provisioning",
  "/dashboard/admin": "Admin",
  "/dashboard/admin/demo-tenants": "Demo Tenants",
  "/dashboard/admin/call-center": "Call Center",
};

function getPageName(pathname: string): string {
  // Exact match first
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  // Check for dynamic routes
  if (pathname.startsWith("/dashboard/agents/")) return "Agent Details";
  if (pathname.startsWith("/dashboard/tasks/")) return "Lead Details";
  if (pathname.startsWith("/dashboard/campaigns/")) return "Campaign Details";
  return "Dashboard";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: isLoadingOrgs, data: organizations } = useOrganizations();
  const activeOrganization = useActiveOrganization();
  const effectiveOrganization = useEffectiveOrganization();
  const isAdmin = (session?.user as DBUser)?.isAdmin === true;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { data: adminOrgs } = useAdminOrganizations();
  const setImpersonatedOrg = useAdminStore((s) => s.setImpersonatedOrg);
  const setActiveMutation = useSetActiveOrganizationMutation();
  const queryClient = useQueryClient();

  const displayOrganizations = isAdmin
    ? adminOrgs?.data || []
    : organizations?.data || [];

  const isLoadingOrgData = isLoadingOrgs || activeOrganization?.isPending;
  const lifecycleSnapshot = useMemo(
    () => buildLifecycleSnapshotFromOrganization(activeOrganization?.data || null),
    [activeOrganization?.data],
  );

  useEffect(() => {
    if (!isPending && !session) {
      toast.error("Please login to access the dashboard");
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (isPending || !session || isLoadingOrgData) return;
    if (isAdmin) return;
    if (!activeOrganization?.data?.id) {
      if (organizations?.data?.length === 0) {
        router.push("/onboarding");
      }
      return;
    }

    const decision = evaluateDashboardLifecycleGate(pathname, lifecycleSnapshot);
    if (!decision.allowed && decision.redirectTo && pathname !== decision.redirectTo) {
      router.push(decision.redirectTo);
      return;
    }

    if (decision.allowed) {
      return;
    }

    if (organizations?.data?.length === 0) {
      router.push("/onboarding");
    }
  }, [
    isPending,
    session,
    isLoadingOrgData,
    organizations?.data?.length,
    activeOrganization?.data?.id,
    isAdmin,
    pathname,
    lifecycleSnapshot,
    router,
  ]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-user-dropdown]')) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (isPending) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleOpenCreateOrg = () => {
    router.push("/onboarding");
  };

  const invalidateAllOrgQueries = () => {
    queryClient.removeQueries({ queryKey: ['taskInstances'] });
    queryClient.removeQueries({ queryKey: ['taskInstancesAnalytics'] });
    queryClient.removeQueries({ queryKey: ['taskInstance'] });
    queryClient.removeQueries({ queryKey: ['recordings'] });
    queryClient.removeQueries({ queryKey: ['recordingsAnalytics'] });
    queryClient.removeQueries({ queryKey: ['agents'] });
    queryClient.removeQueries({ queryKey: ['tasks'] });
    queryClient.removeQueries({ queryKey: ['admin'] });
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleSwitchOrg = (orgId: string, orgName: string, orgLogo?: string | null) => {
    if (isAdmin) {
      setImpersonatedOrg({ id: orgId, name: orgName, logo: orgLogo });
      setUserDropdownOpen(false);
      invalidateAllOrgQueries();
      toast.success(`Switched to ${orgName}`);
    } else {
      setActiveMutation.mutate(
        { organizationId: orgId },
        {
          onSuccess: () => {
            setUserDropdownOpen(false);
            invalidateAllOrgQueries();
            toast.success(`Switched to ${orgName}`);
          },
          onError: () => {
            toast.error("Failed to switch organization");
          },
        }
      );
    }
  };

  const pageName = getPageName(pathname);
  const userInitial = session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <DialerProvider>
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Inline header row */}
        <div className="px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 border-b border-border/50">
          {/* Left: collapse toggle + page name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden sm:flex p-1.5 rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <span className="text-sm font-medium text-foreground">{pageName}</span>
          </div>

          {/* Right: user avatar dropdown */}
          <div className="relative" data-user-dropdown>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-accent transition"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-semibold">{userInitial}</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-scale-in">
                {/* User info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{session.user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                </div>

                {/* Org switcher */}
                <div className="max-h-48 overflow-y-auto scrollbar-minimal">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Organizations
                  </div>
                  {displayOrganizations.map((org: any) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id, org.name, org.logo)}
                      disabled={setActiveMutation.isPending}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition text-left ${
                        org.id === effectiveOrganization?.data?.id ? 'bg-accent' : ''
                      } disabled:opacity-50`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {org.logo ? (
                          <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary-foreground font-semibold text-xs">{org.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="truncate text-foreground">{org.name}</span>
                      {org.id === effectiveOrganization?.data?.id && (
                        <span className="ml-auto text-xs text-primary">&#10003;</span>
                      )}
                    </button>
                  ))}
                  {handleOpenCreateOrg && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleOpenCreateOrg();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-accent transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add organization</span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-border">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition"
                  >
                    Settings
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                  </Link>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-red-50 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global incoming call banner */}
        <GlobalIncomingCallBanner />

        {/* Content Area - no card wrapper */}
        <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-minimal">
          <div className="mx-auto max-w-[96rem]">
            {children}
          </div>
        </div>
      </div>
    </div>
    </DialerProvider>
  );
}
