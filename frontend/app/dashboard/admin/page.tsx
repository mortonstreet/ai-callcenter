"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  useAdminStats,
  useAdminUsers,
  useAdminOrganizations,
  useAdminCreateOrganization,
  useAdminUpdateOrganizationLogo,
  useAdminDeleteOrganization,
} from "@/hooks/api/useAdmin";
import { Users, Building2, Eye, Plus, Copy, Image, Upload, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/lib/admin-store";
import { useRouter } from "next/navigation";
import CreateAgentModal from "@/components/admin/CreateAgentModal";

type Tab = "users" | "organizations";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [orgName, setOrgName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [agentModalOrg, setAgentModalOrg] = useState<{ id: string; name: string } | null>(null);
  const [logoModalOrg, setLogoModalOrg] = useState<{ id: string; name: string; logo?: string | null } | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [deleteModalOrg, setDeleteModalOrg] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();
  const setImpersonatedOrg = useAdminStore((s) => s.setImpersonatedOrg);
  
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers();
  const { data: orgsData, isLoading: orgsLoading } = useAdminOrganizations();
  const createOrgMutation = useAdminCreateOrganization();
  const updateLogoMutation = useAdminUpdateOrganizationLogo();
  const deleteOrgMutation = useAdminDeleteOrganization();

  const handleUpdateLogo = () => {
    if (!logoModalOrg || !logoUrl.trim()) {
      toast.error("Please enter a logo URL");
      return;
    }
    updateLogoMutation.mutate(
      { organizationId: logoModalOrg.id, logo: logoUrl.trim() },
      {
        onSuccess: () => {
          toast.success("Logo updated successfully");
          setLogoModalOrg(null);
          setLogoUrl("");
        },
        onError: () => {
          toast.error("Failed to update logo");
        },
      }
    );
  };

  const openLogoModal = (org: { id: string; name: string; logo?: string | null }) => {
    setLogoModalOrg(org);
    setLogoUrl(org.logo || "");
  };

  const handleViewAsOrg = (org: { id: string; name: string }) => {
    setImpersonatedOrg({ id: org.id, name: org.name });
    toast.success(`Now viewing as ${org.name}`);
    router.push("/dashboard");
  };

  const handleCopyOrgId = (orgId: string) => {
    navigator.clipboard.writeText(orgId);
    toast.success("Add as x-organization-id header value");
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !ownerEmail) {
      toast.error("Please fill in all fields");
      return;
    }
    createOrgMutation.mutate(
      { name: orgName, ownerEmail },
      {
        onSuccess: () => {
          toast.success("Organization created successfully");
          setOrgName("");
          setOwnerEmail("");
        },
        onError: () => {
          toast.error("Failed to create organization");
        },
      }
    );
  };

  const handleDeleteOrg = () => {
    if (!deleteModalOrg) return;
    deleteOrgMutation.mutate(deleteModalOrg.id, {
      onSuccess: () => {
        toast.success(`Organization "${deleteModalOrg.name}" deleted successfully`);
        setDeleteModalOrg(null);
      },
      onError: () => {
        toast.error("Failed to delete organization");
      },
    });
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "organizations", label: "Organizations", icon: Building2 },
  ];

  return (
    <Page title="Admin" subtitle="Manage users and organizations">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsLoading ? "..." : stats?.users ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Organizations</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsLoading ? "..." : stats?.organizations ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition
                ${activeTab === tab.id
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "users" && (
        <Card title="Users">
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
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          user.emailVerified 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {user.emailVerified ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          user.isAdmin 
                            ? "bg-purple-100 text-purple-700" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {user.isAdmin ? "Admin" : "User"}
                        </span>
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
          <Card title="Create Organization" className="mb-6">
            <form onSubmit={handleCreateOrg} className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Organization Name"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Owner Email"
                  type="email"
                  placeholder="owner@example.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                loading={createOrgMutation.isPending}
                disabled={createOrgMutation.isPending}
              >
                Create
              </Button>
            </form>
          </Card>
        <Card title="Organizations">
          {orgsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading organizations...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Logo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Slug</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgsData?.data?.map((org) => (
                    <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openLogoModal(org)}
                          className="group relative w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 hover:border-[var(--color-primary)] transition overflow-hidden flex items-center justify-center bg-gray-50"
                        >
                          {org.logo ? (
                            <img 
                              src={org.logo} 
                              alt={`${org.name} logo`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image className="h-4 w-4 text-gray-400 group-hover:text-[var(--color-primary)]" />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Upload className="h-4 w-4 text-white" />
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{org.name}</td>
                      <td className="py-3 px-4 text-gray-600">{org.slug}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyOrgId(org.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            title="Copy Organization ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            ID
                          </button>
                          <button
                            onClick={() => setAgentModalOrg({ id: org.id, name: org.name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agent
                          </button>
                          <button
                            onClick={() => handleViewAsOrg(org)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View as
                          </button>
                          <button
                            onClick={() => setDeleteModalOrg({ id: org.id, name: org.name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                            title="Delete Organization"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Logo Upload Modal */}
      {logoModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => {
              setLogoModalOrg(null);
              setLogoUrl("");
            }} 
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <button
              onClick={() => {
                setLogoModalOrg(null);
                setLogoUrl("");
              }}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Update Logo for {logoModalOrg.name}
            </h2>
            
            {/* Logo Preview */}
            <div className="mb-4 flex justify-center">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Image className="h-8 w-8 text-gray-400" />
                )}
              </div>
            </div>
            
            <Input
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Enter a URL to an image (PNG, JPG, or SVG recommended)
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setLogoModalOrg(null);
                  setLogoUrl("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateLogo}
                loading={updateLogoMutation.isPending}
                disabled={updateLogoMutation.isPending || !logoUrl.trim()}
                className="flex-1"
              >
                Save Logo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setDeleteModalOrg(null)} 
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <button
              onClick={() => setDeleteModalOrg(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Delete Organization
              </h2>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteModalOrg.name}</span>?
            </p>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
              This action cannot be undone. All members, agents, tasks, and recordings associated with this organization will be permanently deleted.
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOrg(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrg}
                loading={deleteOrgMutation.isPending}
                disabled={deleteOrgMutation.isPending}
                className="flex-1 !bg-red-600 hover:!bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

