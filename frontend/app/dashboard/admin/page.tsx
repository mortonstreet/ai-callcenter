"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  useAdminUsers,
  useAdminOrganizations,
} from "@/hooks/api/useAdmin";
import { Users, Building2, Eye, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/lib/admin-store";
import { useRouter } from "next/navigation";
import CreateAgentModal from "@/components/admin/CreateAgentModal";
import CreateOrganizationModal from "@/components/admin/CreateOrganizationModal";

type Tab = "users" | "organizations";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [agentModalOrg, setAgentModalOrg] = useState<{ id: string; name: string } | null>(null);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const router = useRouter();
  const setImpersonatedOrg = useAdminStore((s) => s.setImpersonatedOrg);

  const { data: usersData, isLoading: usersLoading } = useAdminUsers();
  const { data: orgsData, isLoading: orgsLoading } = useAdminOrganizations();

  const handleViewAsOrg = (org: { id: string; name: string }) => {
    setImpersonatedOrg({ id: org.id, name: org.name });
    toast.success(`Now viewing as ${org.name}`);
    router.push("/dashboard");
  };

  const handleCopyOrgId = (orgId: string) => {
    navigator.clipboard.writeText(orgId);
    toast.success("Add as x-organization-id header value");
  };

  const userCount = usersData?.data?.length ?? 0;
  const orgCount = orgsData?.data?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: typeof Users; count: number }[] = [
    { id: "users", label: "Users", icon: Users, count: userCount },
    { id: "organizations", label: "Organizations", icon: Building2, count: orgCount },
  ];

  return (
    <Page title="Admin" subtitle="Manage users and organizations">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 pb-3 text-sm font-medium border-b-2 cursor-pointer
                ${activeTab === tab.id
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-gray-500 hover:text-gray-700 active:text-gray-900"
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <Badge variant={activeTab === tab.id ? "primary" : "gray"} className="ml-1">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "users" && (
        <Card title={`Users (${userCount})`}>
          {usersLoading ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Verified</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Admin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData?.data?.map((user: { id: string; email: string; name: string | null; createdAt: string; isAdmin: boolean; emailVerified: boolean }) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{user.email}</td>
                      <td className="py-3 px-4 text-gray-600">{user.name || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={user.emailVerified ? "green" : "yellow"}>
                          {user.emailVerified ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.isAdmin ? "purple" : "gray"}>
                          {user.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "organizations" && (
        <>
          <Card
            title={`Organizations (${orgCount})`}
            headerAction={
              <Button variant="outline" onClick={() => setShowCreateOrgModal(true)}>
                <span className="flex items-center whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Organization
                </span>
              </Button>
            }
          >
          {orgsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading organizations...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Slug</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgsData?.data?.map((org) => (
                    <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{org.name}</td>
                      <td className="py-3 px-4 text-gray-600">{org.slug}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyOrgId(org.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition cursor-pointer"
                            title="Copy Organization ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            ID
                          </button>
                          <button
                            onClick={() => setAgentModalOrg({ id: org.id, name: org.name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-100 rounded-lg hover:bg-green-200 active:bg-green-300 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agent
                          </button>
                          <button
                            onClick={() => handleViewAsOrg(org)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 active:bg-[var(--color-primary)]/30 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View as
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        </>
      )}

      {/* Create Agent Modal */}
      {agentModalOrg && (
        <CreateAgentModal
          isOpen={!!agentModalOrg}
          onClose={() => setAgentModalOrg(null)}
          organizationId={agentModalOrg.id}
          organizationName={agentModalOrg.name}
        />
      )}

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
      />
    </Page>
  );
}

