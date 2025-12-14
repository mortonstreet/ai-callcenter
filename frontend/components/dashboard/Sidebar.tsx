/* eslint-disable  @typescript-eslint/no-explicit-any */

"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ListTodo, Video, Settings, LogOut, ChevronDown, ChevronsUpDown, Shield, LayoutDashboard, User } from "lucide-react";
import { useOrganizations, useSetActiveOrganizationMutation } from "@/hooks/api/useOrganization";
import { toast } from "sonner";
import { useActiveOrganization, useSession } from "@/lib/auth-client";
import { DBUser } from "@shared/types/src";
import Dropdown, { DropdownTrigger, DropdownItem, DropdownLink } from "@/components/ui/Dropdown";
import Button from "@/components/ui/Button";

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
  const activeOrganization = useActiveOrganization();
  const { data: organizations } = useOrganizations();
  const setActiveMutation = useSetActiveOrganizationMutation();
  const { data: session } = useSession();
  const isAdmin = (session?.user as DBUser)?.isAdmin === true;

  const handleSwitchOrg = (orgId: string) => {
    setActiveMutation.mutate(
      { organizationId: orgId },
      {
        onSuccess: () => {
          toast.success("Organization switched successfully");
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
                    <div className="w-8 h-8 rounded-lg bg-(--color-primary) flex items-center justify-center shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="flex-1 min-w-0 text-left text-neutral-800">{org.name}</span>
                    {org.id === activeOrganization?.data?.id && (
                      <span className="shrink-0 text-(--color-primary)">✓</span>
                    )}
                  </button>
                ))}
                {onOpenCreateOrg && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCreateOrg();
                    }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition text-(--color-primary) hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-(--color-primary) flex items-center justify-center shrink-0">
                      <span className="text-(--color-primary) font-semibold text-lg">+</span>
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
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full justify-start gap-3 text-red-600! hover:bg-red-50!"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  <span>Logout</span>
                </Button>
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
          <Dropdown
            position="top"
            trigger={
              <DropdownTrigger icon={<ChevronsUpDown className="h-4 w-4" />}>
                <div className="w-5 h-5 rounded bg-(--color-primary) flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {activeOrganization?.data?.name?.charAt(0).toUpperCase() || "O"}
                  </span>
                </div>
                <span className="truncate">{activeOrganization?.data?.name || "Organization"}</span>
              </DropdownTrigger>
            }
          >
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {organizations?.data?.map((org) => (
                <DropdownItem
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  disabled={setActiveMutation.isPending}
                  active={org.id === activeOrganization?.data?.id}
                >
                  <div className="w-5 h-5 rounded bg-(--color-primary) flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate">{org.name}</span>
                </DropdownItem>
              ))}
              {onOpenCreateOrg && (
                <DropdownItem onClick={onOpenCreateOrg} className="text-(--color-primary)!">
                  <div className="w-5 h-5 rounded border-2 border-dashed border-(--color-primary) flex items-center justify-center shrink-0">
                    <span className="text-(--color-primary) font-semibold text-xs">+</span>
                  </div>
                  <span>Create Organization</span>
                </DropdownItem>
              )}
            </div>
          </Dropdown>

          {/* Profile Menu */}
          <Dropdown
            position="top"
            trigger={
              <DropdownTrigger icon={<ChevronDown className="h-4 w-4" />}>
                <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-neutral-600" />
                </div>
                <span className="truncate">{session?.user?.name || "Profile"}</span>
              </DropdownTrigger>
            }
          >
            <div className="space-y-0.5">
              <DropdownLink href="/dashboard/settings">
                <Settings className="h-[18px] w-[18px]" />
                <span>Settings</span>
              </DropdownLink>
              <DropdownItem onClick={onLogout} variant="danger">
                <LogOut className="h-[18px] w-[18px]" />
                <span>Logout</span>
              </DropdownItem>
            </div>
          </Dropdown>
        </div>
      </aside>
    </>
  );
}

