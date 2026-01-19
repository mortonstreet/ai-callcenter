/* eslint-disable  @typescript-eslint/no-explicit-any */

"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Users, Video, Settings, LogOut, ChevronDown, Shield, LayoutDashboard, Calendar, Kanban, Headphones, Plus } from "lucide-react";
import { useOrganizations, useSetActiveOrganizationMutation } from "@/hooks/api/useOrganization";
import { useAdminOrganizations } from "@/hooks/api/useAdmin";
import { toast } from "sonner";
import { useActiveOrganization, useSession } from "@/lib/auth-client";
import { useAdminStore, useEffectiveOrganization } from "@/lib/admin-store";
import { DBUser } from "@/lib/shared-types";
import { useQueryClient } from "@tanstack/react-query";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/admin/call-center", label: "Call Center", icon: Headphones },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/tasks", label: "Leads", icon: Users },
  { href: "/dashboard/schedule", label: "Schedule", icon: Calendar },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/recordings", label: "Recordings", icon: Video },
];

const bottom = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];


export default function Sidebar({
  onLogout,
  onOpenCreateOrg,
}: { 
  onLogout?: () => void;
  onOpenCreateOrg?: () => void;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeOrganization = useActiveOrganization();
  const effectiveOrganization = useEffectiveOrganization();
  const { data: organizations } = useOrganizations();
  const { data: adminOrgs } = useAdminOrganizations();
  const setActiveMutation = useSetActiveOrganizationMutation();
  const setImpersonatedOrg = useAdminStore((s) => s.setImpersonatedOrg);
  const { data: session } = useSession();
  const isAdmin = (session?.user as DBUser)?.isAdmin === true;
  const queryClient = useQueryClient();
  
  // For admins, show all organizations; for regular users, show only their orgs
  const displayOrganizations = isAdmin 
    ? adminOrgs?.data || []
    : organizations?.data || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchOrg = (orgId: string, orgName: string, orgLogo?: string | null) => {
    // Helper to invalidate all org-specific queries
    const invalidateAllOrgQueries = () => {
      // Clear ALL cached data for these query types to force fresh fetch
      // This ensures schedule, pipeline, leads, recordings all sync properly
      queryClient.removeQueries({ queryKey: ['taskInstances'] });
      queryClient.removeQueries({ queryKey: ['taskInstancesAnalytics'] });
      queryClient.removeQueries({ queryKey: ['taskInstance'] });
      queryClient.removeQueries({ queryKey: ['recordings'] });
      queryClient.removeQueries({ queryKey: ['recordingsAnalytics'] });
      queryClient.removeQueries({ queryKey: ['agents'] });
      queryClient.removeQueries({ queryKey: ['tasks'] });
      queryClient.removeQueries({ queryKey: ['admin'] });
    };

    if (isAdmin) {
      // Admins use impersonation to view any org seamlessly
      setImpersonatedOrg({ id: orgId, name: orgName, logo: orgLogo });
      setOrgDropdownOpen(false);
      invalidateAllOrgQueries();
      toast.success(`Switched to ${orgName}`);
    } else {
      // Regular users use the standard setActive mutation
      setActiveMutation.mutate(
        { organizationId: orgId },
        {
          onSuccess: () => {
            setOrgDropdownOpen(false);
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

  const Item = ({
    href, label, icon: Icon, active, onClick,
  }: { href: string; label: string; icon: any; active?: boolean; onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-gray-800 hover:bg-gray-100",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 opacity-90" />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Top Nav */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="hover:opacity-80 transition">
            <img 
              src="/revcenter-logo.svg" alt="REVCENTER" loading="eager" fetchPriority="high" className="jsx-bd372fbcc3531114 h-6 sm:h-7 md:h-8 w-auto transition-all duration-300"
            />
          </Link>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
          >
            <span
              className={[
                "block w-6 h-0.5 bg-gray-900 transition-all duration-300 ease-in-out",
                mobileMenuOpen ? "rotate-45 translate-y-2" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-6 h-0.5 bg-gray-900 transition-all duration-300 ease-in-out",
                mobileMenuOpen ? "opacity-0" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-6 h-0.5 bg-gray-900 transition-all duration-300 ease-in-out",
                mobileMenuOpen ? "-rotate-45 -translate-y-2" : "",
              ].join(" ")}
            />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div
          className={[
            "overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <nav className="px-4 py-4 space-y-2 border-t border-gray-100">
            {nav.map((n) => (
              <Item
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={n.href === "/dashboard" ? pathname === n.href : pathname?.startsWith(n.href)}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}

            {isAdmin && adminNav.map((n) => (
              <Item
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={pathname?.startsWith(n.href)}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
            
            <div className="pt-2 mt-2 border-t border-gray-200 space-y-2">
              {bottom.map((n) => (
                <Item
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  icon={n.icon}
                  active={pathname?.startsWith(n.href)}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}

              {/* Mobile Organization Switcher */}
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Organizations
                </div>
                {displayOrganizations.map((org: any) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      handleSwitchOrg(org.id, org.name, org.logo);
                      setMobileMenuOpen(false);
                    }}
                    disabled={setActiveMutation.isPending}
                    className={`
                      w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
                      text-gray-800
                      ${org.id === effectiveOrganization?.data?.id ? 'bg-gray-100' : 'hover:bg-gray-50'}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {org.logo ? (
                        <img 
                          src={org.logo} 
                          alt={org.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 min-w-0 text-left text-gray-800">{org.name}</span>
                    {org.id === effectiveOrganization?.data?.id && (
                      <span className="flex-shrink-0 text-[var(--color-primary)]">✓</span>
                    )}
                  </button>
                ))}
                {onOpenCreateOrg && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCreateOrg();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add organization</span>
                  </button>
                )}
              </div>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout?.();
                }}
                className="
                  group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium
                  text-red-600 hover:bg-red-50 transition
                "
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="
          fixed inset-y-0 left-0 z-20
          w-60 md:w-64
          border-r border-gray-200 bg-white/90 backdrop-blur
          px-3 py-4 md:px-4 md:py-6
          hidden sm:flex
          flex-col
        "
      >
        {/* Top: logo / app name */}
        <div className="mb-5 px-2">
          <Link href="/dashboard" className="hover:opacity-80 transition">
            <img 
              src="/revcenter-logo.svg" alt="REVCENTER" loading="eager" fetchPriority="high" className="h-[40px] sm:h-[40px] md:h-[20px] w-auto"
            />
          </Link>
        </div>
        
        <div className="border-b border-gray-200 mb-6" />

        {/* Primary nav */}
        <nav className="space-y-2">
          {nav.map((n) => (
            <Item
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={n.href === "/dashboard" ? pathname === n.href : pathname?.startsWith(n.href)}
            />
          ))}
          {isAdmin && adminNav.map((n) => (
            <Item
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={pathname?.startsWith(n.href)}
            />
          ))}
        </nav>

        {/* Bottom actions pinned */}
        <div className="mt-auto space-y-2 pt-6 border-t border-gray-200">
          {bottom.map((n) => (
            <Item
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={pathname?.startsWith(n.href)}
            />
          ))}

          {/* Organization Switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="
                group flex w-full items-center justify-between gap-3 rounded-xl pl-1 pr-3 py-2 text-sm font-medium
                text-gray-800 hover:bg-gray-100 transition border border-gray-200
              "
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {effectiveOrganization?.data?.logo ? (
                    <img 
                      src={effectiveOrganization.data.logo} 
                      alt={effectiveOrganization.data.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {effectiveOrganization?.data?.name?.charAt(0).toUpperCase() || "O"}
                    </span>
                  )}
                </div>
                <span className="truncate text-gray-800">{effectiveOrganization?.data?.name || "Organization"}</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${orgDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {orgDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {displayOrganizations.map((org: any) => (
                    <button 
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id, org.name, org.logo)}
                      disabled={setActiveMutation.isPending}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-sm
                        hover:bg-gray-50 transition text-left
                        ${org.id === effectiveOrganization?.data?.id ? 'bg-gray-50' : ''}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {org.logo ? (
                          <img 
                            src={org.logo} 
                            alt={org.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {org.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-gray-800">{org.name}</span>
                      {org.id === effectiveOrganization?.data?.id && (
                        <span className="ml-auto text-xs text-[var(--color-primary)]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {onOpenCreateOrg && (
                  <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        onOpenCreateOrg();
                      }}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add organization</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="
              group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium
              text-red-600 hover:bg-red-50 transition
            "
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

