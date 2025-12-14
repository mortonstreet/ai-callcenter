/* eslint-disable  @typescript-eslint/no-explicit-any */

"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ListTodo, Video, Settings, LogOut, ChevronDown, ChevronsUpDown, Shield, LayoutDashboard, User } from "lucide-react";
import { useOrganizations, useSetActiveOrganizationMutation } from "@/hooks/api/useOrganization";
import { toast } from "sonner";
import { useActiveOrganization, useSession } from "@/lib/auth-client";
import { DBUser } from "@shared/types/src";
import { cardStyles } from "@/components/ui/Card";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo },
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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const activeOrganization = useActiveOrganization();
  const { data: organizations } = useOrganizations();
  const setActiveMutation = useSetActiveOrganizationMutation();
  const { data: session } = useSession();
  const isAdmin = (session?.user as DBUser)?.isAdmin === true;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchOrg = (orgId: string) => {
    setActiveMutation.mutate(
      { organizationId: orgId },
      {
        onSuccess: () => {
          toast.success("Organization switched successfully");
          setOrgDropdownOpen(false);
        },
        onError: () => {
          toast.error("Failed to switch organization");
        },
      }
    );
  };

  const Item = ({
    href, label, icon: Icon, active, onClick,
  }: { href: string; label: string; icon: any; active?: boolean; onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-[15px] font-medium text-neutral-600",
        active
          ? "bg-gray-100 text-black!"
          : "hover:bg-gray-50 active:bg-gray-100 active:text-black",
      ].join(" ")}
    >
      <Icon className="h-[18px] w-[18px] opacity-90" />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Top Nav */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-2xl font-black tracking-tighter text-neutral-800 uppercase hover:opacity-80 transition">
            <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center">
              {/* Icon placeholder */}
            </div>
            RevCenter
          </Link>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
          >
            <span
              className={[
                "block w-6 h-0.5 bg-neutral-800 transition-all duration-300 ease-in-out",
                mobileMenuOpen ? "rotate-45 translate-y-2" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-6 h-0.5 bg-neutral-800 transition-all duration-300 ease-in-out",
                mobileMenuOpen ? "opacity-0" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-6 h-0.5 bg-neutral-800 transition-all duration-300 ease-in-out",
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

            <div className="pt-2 mt-2 border-t border-gray-200 space-y-2">
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
                {organizations?.data?.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      handleSwitchOrg(org.id);
                      setMobileMenuOpen(false);
                    }}
                    disabled={setActiveMutation.isPending}
                    className={`
                      w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
                      text-neutral-800
                      ${org.id === activeOrganization?.data?.id ? 'bg-gray-100' : 'hover:bg-gray-50'}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="flex-1 min-w-0 text-left text-neutral-800">{org.name}</span>
                    {org.id === activeOrganization?.data?.id && (
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
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition text-[var(--color-primary)] hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--color-primary)] font-semibold text-lg">+</span>
                    </div>
                    <span>Create Organization</span>
                  </button>
                )}
              </div>
              
              {/* Mobile Profile Section */}
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Profile
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition text-neutral-800 hover:bg-gray-50"
                >
                  <Settings className="h-[18px] w-[18px]" />
                  <span>Settings</span>
                </Link>
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
                  <LogOut className="h-[18px] w-[18px]" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="
          fixed inset-y-0 left-0 z-20
          w-56 md:w-64
          bg-white
          px-3 py-4 md:px-4 md:py-6
          hidden sm:flex
          flex-col
        "
      >
        {/* Top: logo / app name */}
        <div className="mb-5 px-2">
          <Link href="/dashboard" className="flex items-center gap-2 text-3xl font-black tracking-tighter text-neutral-800 uppercase hover:opacity-80 transition">
            <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center">
              {/* Icon placeholder */}
            </div>
            RevCenter
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="space-y-0.5">
          {nav.map((n) => (
            <Item
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={n.href === "/dashboard" ? pathname === n.href : pathname?.startsWith(n.href)}
            />
          ))}
        </nav>

        {/* Bottom actions pinned */}
        <div className="mt-auto space-y-0.5 pt-6">
          {isAdmin && adminNav.map((n) => (
            <Item
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={pathname?.startsWith(n.href)}
            />
          ))}
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
                group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-1.5 text-[15px] font-medium
                text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black cursor-pointer
              "
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-5 h-5 rounded bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {activeOrganization?.data?.name?.charAt(0).toUpperCase() || "O"}
                  </span>
                </div>
                <span className="truncate">{activeOrganization?.data?.name || "Organization"}</span>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0" />
            </button>

            {/* Dropdown */}
            {orgDropdownOpen && (
              <div className={`absolute bottom-full left-0 right-0 mb-0.5 ${cardStyles} p-1.5`}>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {organizations?.data?.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      disabled={setActiveMutation.isPending}
                      className={`
                        w-full flex items-center gap-3 px-3 py-1.5 text-[15px] font-medium rounded-lg cursor-pointer text-left
                        hover:bg-gray-50 active:bg-gray-100 active:text-black
                        ${org.id === activeOrganization?.data?.id ? 'bg-gray-100 text-black' : 'text-neutral-600'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <div className="w-5 h-5 rounded bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <span className="text-white font-semibold text-xs">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="truncate">{org.name}</span>
                    </button>
                  ))}
                  {onOpenCreateOrg && (
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        onOpenCreateOrg();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-1.5 text-[15px] font-medium rounded-lg cursor-pointer text-left text-[var(--color-primary)] hover:bg-gray-50 active:bg-gray-100"
                    >
                      <div className="w-5 h-5 rounded border-2 border-dashed border-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <span className="text-[var(--color-primary)] font-semibold text-xs">+</span>
                      </div>
                      <span>Create Organization</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="
                group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-1.5 text-[15px] font-medium
                text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black cursor-pointer
              "
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-neutral-600" />
                </div>
                <span className="truncate">{session?.user?.name || "Profile"}</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform shrink-0 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {profileDropdownOpen && (
              <div className={`absolute bottom-full left-0 right-0 mb-0.5 ${cardStyles} p-1.5`}>
                <div className="space-y-0.5">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="
                      w-full flex items-center gap-3 px-3 py-1.5 text-[15px] font-medium rounded-lg cursor-pointer text-left
                      text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black
                    "
                  >
                    <Settings className="h-[18px] w-[18px]" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="
                      w-full flex items-center gap-3 px-3 py-1.5 text-[15px] font-medium rounded-lg cursor-pointer text-left
                      text-red-600 hover:bg-red-50 active:bg-red-100
                    "
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

