/* eslint-disable  @typescript-eslint/no-explicit-any */

"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Users, Video, Settings, LayoutDashboard, Calendar, Kanban, Headphones, Shield, Menu, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { DBUser } from "@/lib/shared-types";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/admin/call-center", label: "Call Center", icon: Headphones },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/schedule", label: "Schedule", icon: Calendar },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/recordings", label: "Recordings", icon: Video },
];

const adminNav = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];

const settingsNav = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as DBUser)?.isAdmin === true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

  const Item = ({
    href, label, icon: Icon, active, onClick,
  }: { href: string; label: string; icon: any; active?: boolean; onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        collapsed ? "justify-center" : "",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      ].join(" ")}
      title={collapsed ? label : undefined}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-primary" : "opacity-90"}`} aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <>
      {/* Mobile Top Nav */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-30 bg-card/90 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="hover:opacity-80 transition">
            <img
              src="/revcenter-logo.svg" alt="REVCENTER" loading="eager" fetchPriority="high" className="h-6 w-auto"
            />
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-accent transition text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div
          className={[
            "overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <nav className="px-4 py-4 space-y-1 border-t border-border" aria-label="Main navigation">
            {nav.map((n) => (
              <Item
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={isActive(n.href)}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
            <div className="pt-2 mt-2 border-t border-border space-y-1">
              {isAdmin && adminNav.map((n) => (
                <Item
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  icon={n.icon}
                  active={pathname === n.href}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
              <div className="h-1" />
              {settingsNav.map((n) => (
                <Item
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  icon={n.icon}
                  active={pathname === n.href}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={[
          "hidden sm:flex flex-col flex-shrink-0 bg-card border-r border-border px-3 py-4 md:py-6 transition-all duration-200",
          collapsed ? "w-16" : "w-56 md:w-60",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={`mb-5 ${collapsed ? 'px-0 flex justify-center' : 'px-2'}`}>
          <Link href="/dashboard" className="hover:opacity-80 transition">
            {collapsed ? (
              <img
                src="/revcenter-r.svg" alt="R" loading="eager" fetchPriority="high" className="h-5 w-auto"
              />
            ) : (
              <img
                src="/revcenter-logo.svg" alt="REVCENTER" loading="eager" fetchPriority="high" className="h-5 w-auto"
              />
            )}
          </Link>
        </div>

        <div className="border-b border-border mb-4" />

        {/* Primary nav */}
        <nav className="space-y-1 flex-1" aria-label="Main navigation">
          {nav.map((n) => (
            <Item
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={isActive(n.href)}
            />
          ))}

          {/* Divider + Admin & Settings */}
          <div className="pt-2 mt-2 border-t border-border space-y-1">
            {isAdmin && adminNav.map((n) => (
              <Item
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={pathname === n.href}
              />
            ))}
            <div className="h-1" />
            {settingsNav.map((n) => (
              <Item
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={pathname === n.href}
              />
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
