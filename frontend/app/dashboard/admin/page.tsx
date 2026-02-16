"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  useAdminStats,
  useAdminUsers,
  useAdminOrganizations,
  useAdminCreateOrganization,
  useAdminDeleteOrganization,
  useDeleteUser,
  useImpersonateUser,
  useReassignUser,
  useAdminResetPassword,
  useAddOrganizationCredits,
  useOrganizationMembers,
  useRemoveUserFromOrganization,
} from "@/hooks/api/useAdmin";
import { useSession } from "@/lib/auth-client";
import ErrorLogsTab from "@/components/admin/ErrorLogsTab";
import ProvisioningOpsTab from "@/components/admin/ProvisioningOpsTab";
import {
  Users,
  Building2,
  AlertTriangle,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  KeyRound,
  UserPlus,
  Plus,
  Eye,
  UserMinus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminUser, AdminOrganization } from "@/lib/shared-types";

type Tab = "users" | "organizations" | "error-logs" | "provisioning-ops";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "users", label: "Users", icon: Users },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "error-logs", label: "Error Logs", icon: AlertTriangle },
  { id: "provisioning-ops", label: "Provisioning Ops", icon: Activity },
];

function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  limit: number;
}) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>
        <span className="text-sm text-foreground px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const { data: session } = useSession();

  // User tab state
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");

  // Org tab state
  const [orgPage, setOrgPage] = useState(1);
  const [orgSearch, setOrgSearch] = useState("");

  // Modal state
  const [deleteUserModal, setDeleteUserModal] = useState<AdminUser | null>(null);
  const [deleteOrgModal, setDeleteOrgModal] = useState<AdminOrganization | null>(null);
  const [reassignModal, setReassignModal] = useState<AdminUser | null>(null);
  const [reassignOrgId, setReassignOrgId] = useState("");
  const [reassignRole, setReassignRole] = useState("member");
  const [resetPasswordModal, setResetPasswordModal] = useState<AdminUser | null>(null);
  const [createOrgModal, setCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [viewMembersOrg, setViewMembersOrg] = useState<AdminOrganization | null>(null);
  const [addCreditsOrg, setAddCreditsOrg] = useState<AdminOrganization | null>(null);
  const [creditsAmount, setCreditsAmount] = useState("");
  const [creditsReason, setCreditsReason] = useState("");

  // Reset page when search changes
  const handleUserSearchChange = (search: string) => {
    setUserSearch(search);
    setUserPage(1);
  };

  const handleOrgSearchChange = (search: string) => {
    setOrgSearch(search);
    setOrgPage(1);
  };

  // Queries
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers({
    page: userPage,
    limit: 20,
    search: userSearch || undefined,
  });
  const { data: orgsData, isLoading: orgsLoading } = useAdminOrganizations({
    page: orgPage,
    limit: 20,
    search: orgSearch || undefined,
  });
  const { data: membersData, isLoading: membersLoading } = useOrganizationMembers(
    viewMembersOrg?.id || null
  );

  // Mutations
  const deleteUserMutation = useDeleteUser();
  const deleteOrgMutation = useAdminDeleteOrganization();
  const impersonateMutation = useImpersonateUser();
  const reassignMutation = useReassignUser();
  const resetPasswordMutation = useAdminResetPassword();
  const createOrgMutation = useAdminCreateOrganization();
  const addCreditsMutation = useAddOrganizationCredits();
  const removeMemberMutation = useRemoveUserFromOrganization();

  const users = usersData?.data || [];
  const userPagination = usersData?.pagination;
  const orgs = orgsData?.data || [];
  const orgPagination = orgsData?.pagination;
  const members = membersData?.data || [];

  const handleDeleteUser = () => {
    if (!deleteUserModal) return;
    deleteUserMutation.mutate(deleteUserModal.id, {
      onSuccess: () => {
        toast.success(`User ${deleteUserModal.email} deleted`);
        setDeleteUserModal(null);
      },
      onError: () => toast.error("Failed to delete user"),
    });
  };

  const handleDeleteOrg = () => {
    if (!deleteOrgModal) return;
    deleteOrgMutation.mutate(deleteOrgModal.id, {
      onSuccess: () => {
        toast.success(`Organization "${deleteOrgModal.name}" deleted`);
        setDeleteOrgModal(null);
      },
      onError: () => toast.error("Failed to delete organization"),
    });
  };

  const handleImpersonate = (user: AdminUser) => {
    impersonateMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(`Impersonating ${user.name || user.email}`);
        window.location.href = "/dashboard";
      },
      onError: () => toast.error("Failed to impersonate user"),
    });
  };

  const handleReassign = () => {
    if (!reassignModal || !reassignOrgId) return;
    reassignMutation.mutate(
      { userId: reassignModal.id, organizationId: reassignOrgId },
      {
        onSuccess: () => {
          toast.success(`User ${reassignModal.email} reassigned successfully`);
          setReassignModal(null);
          setReassignOrgId("");
          setReassignRole("member");
        },
        onError: () => toast.error("Failed to reassign user"),
      }
    );
  };

  const handleResetPassword = () => {
    if (!resetPasswordModal) return;
    resetPasswordMutation.mutate(resetPasswordModal.id, {
      onSuccess: (data) => {
        if (data.temporaryPassword) {
          toast.success(`Temporary password: ${data.temporaryPassword}`);
        } else {
          toast.success("Password reset email sent");
        }
        setResetPasswordModal(null);
      },
      onError: () => toast.error("Failed to reset password"),
    });
  };

  const handleCreateOrg = () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createOrgMutation.mutate(
      { name: newOrgName.trim(), slug: newOrgSlug.trim() },
      {
        onSuccess: () => {
          toast.success(`Organization "${newOrgName}" created`);
          setCreateOrgModal(false);
          setNewOrgName("");
          setNewOrgSlug("");
        },
        onError: () => toast.error("Failed to create organization"),
      }
    );
  };

  const handleAddCredits = () => {
    if (!addCreditsOrg || !creditsAmount) return;
    const amount = parseFloat(creditsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    addCreditsMutation.mutate(
      { organizationId: addCreditsOrg.id, amount },
      {
        onSuccess: (data) => {
          toast.success(`Added ${amount} credits to ${addCreditsOrg.name}. New balance: ${data.newBalance}`);
          setAddCreditsOrg(null);
          setCreditsAmount("");
          setCreditsReason("");
        },
        onError: () => toast.error("Failed to add credits"),
      }
    );
  };

  const handleRemoveMember = (userId: string, email?: string) => {
    if (!viewMembersOrg) return;
    removeMemberMutation.mutate(
      { organizationId: viewMembersOrg.id, userId },
      {
        onSuccess: () => toast.success(`User ${email || ""} removed from organization`),
        onError: () => toast.error("Failed to remove member"),
      }
    );
  };

  return (
    <Page title="Admin" subtitle="Manage users, organizations, and system health">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-semibold text-foreground">
                {statsLoading ? "..." : stats?.users ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organizations</p>
              <p className="text-2xl font-semibold text-foreground">
                {statsLoading ? "..." : stats?.organizations ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Underline Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== USERS TAB ===== */}
      {activeTab === "users" && (
        <div>
          <SearchBar
            value={userSearch}
            onChange={handleUserSearchChange}
            placeholder="Search by email, name, or organization..."
          />

          {usersLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Organizations</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Verified</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: AdminUser) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted transition">
                      <td className="py-3 px-4 text-foreground">{user.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {user.organizations?.length > 0
                          ? user.organizations.join(", ")
                          : "—"}
                      </td>
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
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {user.role === "admin" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {user.id !== session?.user?.id && (
                            <>
                              <button
                                onClick={() => handleImpersonate(user)}
                                disabled={impersonateMutation.isPending}
                                className="text-xs text-primary hover:underline disabled:opacity-50"
                              >
                                Impersonate
                              </button>
                              {user.role !== "admin" && (
                                <button
                                  onClick={() => setResetPasswordModal(user)}
                                  className="text-xs text-amber-600 hover:underline"
                                  title="Reset password"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setReassignModal(user);
                                  setReassignOrgId("");
                                  setReassignRole("member");
                                }}
                                className="text-xs text-blue-600 hover:underline"
                                title="Reassign to organization"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                              </button>
                              {user.role !== "admin" && (
                                <button
                                  onClick={() => setDeleteUserModal(user)}
                                  className="text-xs text-red-600 hover:underline"
                                  title="Delete user"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Pagination */}
          {userPagination && userPagination.totalPages > 1 && (
            <Pagination
              page={userPagination.page}
              totalPages={userPagination.totalPages}
              total={userPagination.total}
              limit={userPagination.limit}
              onPageChange={setUserPage}
            />
          )}
        </div>
      )}

      {/* ===== ORGANIZATIONS TAB ===== */}
      {activeTab === "organizations" && (
        <div>
          {/* Search + Create */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 mr-4">
              <SearchBar
                value={orgSearch}
                onChange={handleOrgSearchChange}
                placeholder="Search by name or slug..."
              />
            </div>
            <Button onClick={() => setCreateOrgModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Organization
            </Button>
          </div>

          {orgsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading organizations...</div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No organizations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Slug</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Members</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Credits</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org: AdminOrganization) => (
                    <tr key={org.id} className="border-b border-border/50 hover:bg-muted transition">
                      <td className="py-3 px-4 text-foreground font-medium">{org.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{org.slug}</td>
                      <td className="py-3 px-4 text-muted-foreground">{org.memberCount}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          org.creditBalance > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {org.creditBalance}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setAddCreditsOrg(org);
                              setCreditsAmount("");
                              setCreditsReason("");
                            }}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Plus className="h-3 w-3" />
                            Credits
                          </button>
                          <button
                            onClick={() => setViewMembersOrg(org)}
                            className="text-xs text-blue-600 hover:underline"
                            title="View members"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteOrgModal(org)}
                            className="text-xs text-red-600 hover:underline"
                            title="Delete organization"
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

          {/* Org Pagination */}
          {orgPagination && orgPagination.totalPages > 1 && (
            <Pagination
              page={orgPagination.page}
              totalPages={orgPagination.totalPages}
              total={orgPagination.total}
              limit={orgPagination.limit}
              onPageChange={setOrgPage}
            />
          )}
        </div>
      )}

      {/* ===== ERROR LOGS TAB ===== */}
      {activeTab === "error-logs" && <ErrorLogsTab />}
      {activeTab === "provisioning-ops" && <ProvisioningOpsTab />}

      {/* ===== MODALS ===== */}

      {/* Delete User Modal */}
      <Modal
        isOpen={!!deleteUserModal}
        onClose={() => setDeleteUserModal(null)}
        title="Delete User"
        subtitle={deleteUserModal ? `Are you sure you want to delete ${deleteUserModal.email}?` : undefined}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The user will be permanently removed from the system.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteUserModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              loading={deleteUserMutation.isPending}
              className="!bg-red-600 hover:!bg-red-700"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Organization Modal */}
      <Modal
        isOpen={!!deleteOrgModal}
        onClose={() => setDeleteOrgModal(null)}
        title="Delete Organization"
        subtitle={deleteOrgModal ? `Are you sure you want to delete "${deleteOrgModal.name}"?` : undefined}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All data associated with this organization will be permanently deleted.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteOrgModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteOrg}
              loading={deleteOrgMutation.isPending}
              className="!bg-red-600 hover:!bg-red-700"
            >
              Delete Organization
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reassign User Modal */}
      <Modal
        isOpen={!!reassignModal}
        onClose={() => { setReassignModal(null); setReassignOrgId(""); setReassignRole("member"); }}
        title="Reassign User"
        subtitle={reassignModal ? `Add ${reassignModal.email} to an organization` : undefined}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Target Organization
            </label>
            <select
              value={reassignOrgId}
              onChange={(e) => setReassignOrgId(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Select an organization...</option>
              {orgsData?.data?.map((org: AdminOrganization) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Role
            </label>
            <select
              value={reassignRole}
              onChange={(e) => setReassignRole(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setReassignModal(null); setReassignOrgId(""); setReassignRole("member"); }}>
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              loading={reassignMutation.isPending}
              disabled={!reassignOrgId.trim()}
            >
              Reassign User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordModal}
        onClose={() => setResetPasswordModal(null)}
        title="Reset User Password"
        subtitle={resetPasswordModal ? `Reset password for ${resetPasswordModal.email}` : undefined}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will generate a temporary password and send it to the user via email.
            They will be required to change their password on their next login.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setResetPasswordModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              loading={resetPasswordMutation.isPending}
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Organization Modal */}
      <Modal
        isOpen={createOrgModal}
        onClose={() => { setCreateOrgModal(false); setNewOrgName(""); setNewOrgSlug(""); }}
        title="Create Organization"
        subtitle="Create a new organization"
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            placeholder="Acme Corp"
            value={newOrgName}
            onChange={(e) => {
              setNewOrgName(e.target.value);
              setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
            }}
          />
          <Input
            label="Slug"
            placeholder="acme-corp"
            value={newOrgSlug}
            onChange={(e) => setNewOrgSlug(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Slug must be lowercase letters, numbers, and hyphens only.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setCreateOrgModal(false); setNewOrgName(""); setNewOrgSlug(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              loading={createOrgMutation.isPending}
              disabled={!newOrgName.trim() || !newOrgSlug.trim()}
            >
              Create Organization
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Members Modal */}
      <Modal
        isOpen={!!viewMembersOrg}
        onClose={() => setViewMembersOrg(null)}
        title="Organization Members"
        subtitle={viewMembersOrg ? `Members of ${viewMembersOrg.name}` : undefined}
      >
        <div className="space-y-4">
          {membersLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No members found</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name || member.email}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full mt-1 ${
                      member.role === "owner"
                        ? "bg-purple-100 text-purple-700"
                        : member.role === "admin"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {member.role}
                    </span>
                  </div>
                  {member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.email)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Remove from organization"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setViewMembersOrg(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Credits Modal */}
      <Modal
        isOpen={!!addCreditsOrg}
        onClose={() => { setAddCreditsOrg(null); setCreditsAmount(""); setCreditsReason(""); }}
        title="Add Credits"
        subtitle={addCreditsOrg ? `Add credits to ${addCreditsOrg.name}` : undefined}
      >
        <div className="space-y-4">
          <Input
            label="Number of Credits"
            type="number"
            placeholder="Enter amount"
            value={creditsAmount}
            onChange={(e) => setCreditsAmount(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Reason (optional)
            </label>
            <textarea
              value={creditsReason}
              onChange={(e) => setCreditsReason(e.target.value)}
              placeholder="e.g., Promotional credits, Customer support adjustment..."
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setAddCreditsOrg(null); setCreditsAmount(""); setCreditsReason(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCredits}
              loading={addCreditsMutation.isPending}
              disabled={!creditsAmount || parseFloat(creditsAmount) <= 0}
            >
              Add Credits
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
