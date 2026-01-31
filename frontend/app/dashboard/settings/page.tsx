/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Page } from "@/components/dashboard/Page";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useInviteMember, useListOrganizationMembers, useListOrganizationInvitations, useCancelOrganizationInvitation, useRemoveOrganizationMember } from "@/hooks/api/useOrganization";
import { useHasPasswordAuth } from "@/hooks/api/useUser";
import { useChangePassword } from "@/hooks/api/useAuth";
import { useEffectiveOrganization, useAdminStore } from "@/lib/admin-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { env, QUERY_KEYS } from "@/lib/config";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: effectiveOrganization } = useEffectiveOrganization();
  const impersonatedOrg = useAdminStore((s) => s.impersonatedOrg);
  const user = session?.user;
  
  // Check if user has password authentication (email/password login)
  const hasPasswordAuth = useHasPasswordAuth();

  // Queries
  const { data: membersData, isLoading: membersLoading } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];
  const { data: invitationsData, isLoading: invitationsLoading } = useListOrganizationInvitations();
  const allInvitations = (invitationsData?.data) || [];
  const invitations = allInvitations.filter((inv: any) => inv.status === "pending");

  // Mutations
  const changePasswordMutation = useChangePassword();
  const inviteMemberMutation = useInviteMember();
  const cancelInvitationMutation = useCancelOrganizationInvitation();
  const removeMemberMutation = useRemoveOrganizationMember();

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  // Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isDeleteOrgModalOpen, setIsDeleteOrgModalOpen] = useState(false);

  // Check if current user is admin
  const currentUserMember = members.find((m: any) => m.userId === user?.id);
  const isAdmin = currentUserMember?.role === "admin";
  const isOwner = currentUserMember?.role === "owner";

  const queryClient = useQueryClient();

  // Parse organization metadata (domain/industry/services) from onboarding
  const orgMeta = useMemo(() => {
    const raw = (effectiveOrganization as any)?.metadata;
    if (!raw) return {};
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      return {};
    }
  }, [effectiveOrganization]);

  // Dev-only organization delete (for local/testing)
  const deleteOrgMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveOrganization?.id) {
        throw new Error("No active organization to delete");
      }
      const res = await fetch(`${env.API_URL}/organization/${effectiveOrganization.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete organization");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Organization deleted (dev only).");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations() });
      setIsDeleteOrgModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete organization");
      setIsDeleteOrgModalOpen(false);
    },
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast.error("Please fill in all password fields");
    }
    
    if (newPassword.length < 8) {
      return toast.error("New password must be at least 8 characters");
    }
    
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    changePasswordMutation.mutate(
      { currentPassword: oldPassword, newPassword },
      {
        onSuccess: (result: any) => {
          if (result.error) {
            toast.error(result.error.message || "Failed to change password");
          } else {
            toast.success("Password changed successfully!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }
        },
        onError: () => {
          toast.error("An error occurred. Please try again.");
        },
      }
    );
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail) {
      return toast.error("Please enter an email address");
    }

    if (!effectiveOrganization) {
      return toast.error("No active organization selected");
    }

    inviteMemberMutation.mutate(
      { email: inviteEmail, role: inviteRole, organizationId: effectiveOrganization.id },
      {
        onSuccess: (result: any) => {
          if (result.error) {
            toast.error(result.error.message || "Failed to send invitation");
          } else {
            toast.success(`Invitation sent to ${inviteEmail}!`);
            setInviteEmail("");
            setInviteRole("member");
          }
        },
        onError: () => {
          toast.error("An error occurred. Please try again.");
        },
      }
    );
  };

  const handleRemoveMember = (member: any) => {
    setMemberToRemove({
      id: member.id,
      name: member.user?.name || member.user?.email || "Unknown",
      email: member.user?.email || "",
    });
    setIsRemoveMemberModalOpen(true);
  };

  const confirmRemoveMember = () => {
    if (!memberToRemove) return;

    removeMemberMutation.mutate(
      { memberIdOrEmail: memberToRemove.id },
      {
        onSuccess: (result: any) => {
          if (result.error) {
            toast.error(result.error.message || "Failed to remove member");
          } else {
            toast.success("Member removed successfully");
          }
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        },
        onError: () => {
          toast.error("Failed to remove member");
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        },
      }
    );
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setInvitationToCancel(invitationId);
    setIsCancelModalOpen(true);
  };

  const confirmCancelInvitation = () => {
    if (!invitationToCancel) return;

    cancelInvitationMutation.mutate(
      { invitationId: invitationToCancel },
      {
        onSuccess: (result: any) => {
          if (result.error) {
            toast.error(result.error.message || "Failed to cancel invitation");
          } else {
            toast.success("Invitation cancelled successfully");
          }
          setIsCancelModalOpen(false);
          setInvitationToCancel(null);
        },
        onError: () => {
          toast.error("Failed to cancel invitation");
          setIsCancelModalOpen(false);
          setInvitationToCancel(null);
        },
      }
    );
  };

  return (
    <Page title="Settings" subtitle="Manage your account and organization settings">
      <div className="space-y-6">
        {/* Account Settings */}
        <Card title="Account">
          <div className="space-y-6">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Name
                  </label>
                  <p className="text-foreground">{user?.name || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Email
                  </label>
                  <p className="text-foreground">{user?.email || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Change Password - Only for email/password users */}
            {hasPasswordAuth && (
              <>
                <div className="border-t border-border" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Current Password"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                      />
                      <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <Input
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" loading={changePasswordMutation.isPending} disabled={changePasswordMutation.isPending}>
                        Update Password
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}

          </div>
        </Card>

        {/* Organization Settings */}
        {effectiveOrganization && (
          <Card title="Organization">
            <div className="space-y-6">
              {/* Organization Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Organization Name
                    </label>
                    <p className="text-foreground">{effectiveOrganization.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Domain
                    </label>
                    <p className="text-foreground">{(orgMeta as any)?.domain || "—"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Industry
                    </label>
                    <p className="text-foreground capitalize">{(orgMeta as any)?.industry || "—"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Services
                    </label>
                    {(orgMeta as any)?.services?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {(orgMeta as any).services.map((svc: string) => (
                          <span
                            key={svc}
                            className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                          >
                            {svc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">—</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Members Section */}
              <div className="space-y-4">
                {/* Invite New Member (Admin Only) */}
                {(isAdmin || isOwner) && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Invite New Member</h3>
                      {impersonatedOrg ? (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-700">
                            To invite members to <strong>{impersonatedOrg.name}</strong>, use the Admin Dashboard.
                          </p>
                        </div>
                      ) : (
                      <form onSubmit={handleInviteMember} className="space-y-4">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Input
                              placeholder="Enter email address"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              required
                            />
                          </div>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as "member")}
                            className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                            aria-label="Member role"
                          >
                            <option value="member">Member</option>
                          </select>
                          <Button type="submit" loading={inviteMemberMutation.isPending} disabled={inviteMemberMutation.isPending}>
                            Invite
                          </Button>
                        </div>
                      </form>
                      )}
                    </div>
                    <div className="border-t border-border" />
                  </>
                )}

                {/* Members List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Team Members ({members.length})
                  </h3>
                  {membersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading members...</div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No members yet</div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member: any) => {
                        const memberName = member.user?.name || "Unknown";
                        const memberEmail = member.user?.email || "";
                        const avatarImage = member.user?.image;
                        const avatarFallback = memberName.charAt(0).toUpperCase();
                        
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                                {avatarImage ? (
                                  <Image
                                    src={avatarImage}
                                    alt={memberName}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-primary-foreground font-semibold">
                                    {avatarFallback}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{memberName}</p>
                                <p className="text-sm text-muted-foreground">{memberEmail}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                  member.role === "admin" || member.role === "owner"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {member.role}
                              </span>
                              {(isAdmin || isOwner) && 
                               member.userId !== user?.id && 
                               member.role !== "admin" && 
                               member.role !== "owner" && (
                                <button
                                  onClick={() => handleRemoveMember(member)}
                                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                                  aria-label="Remove member"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                  <>
                    <div className="border-t border-border" />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        Pending Invitations ({invitations.length})
                      </h3>
                      {invitationsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading invitations...</div>
                      ) : (
                        <div className="space-y-2">
                          {invitations.map((invitation: any) => {
                            const inviteeEmail = invitation.email;
                            const avatar = inviteeEmail.charAt(0).toUpperCase();
                            
                            return (
                              <div
                                key={invitation.id}
                                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                                    <span className="text-muted-foreground font-semibold">
                                      {avatar}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{inviteeEmail}</p>
                                    <p className="text-sm text-muted-foreground">Invited • Pending acceptance</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                                    {invitation.role}
                                  </span>
                                  {(isAdmin || isOwner) && (
                                    <button
                                      onClick={() => handleCancelInvitation(invitation.id)}
                                      className="text-sm text-red-600 hover:text-red-700"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {process.env.NODE_ENV !== "production" && effectiveOrganization?.id && !impersonatedOrg && (
          <Card title="Danger Zone">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Delete the current organization and all related data. This is only enabled in development.
              </p>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setIsDeleteOrgModalOpen(true)}
                disabled={deleteOrgMutation.isPending}
              >
                Delete Organization
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Cancel Invitation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setInvitationToCancel(null);
        }}
        title="Cancel Invitation"
        subtitle="Are you sure you want to cancel this invitation?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The invited user will no longer be able to accept this invitation.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelModalOpen(false);
                setInvitationToCancel(null);
              }}
            >
              No, Keep It
            </Button>
            <Button
              onClick={confirmCancelInvitation}
              loading={cancelInvitationMutation.isPending}
              disabled={cancelInvitationMutation.isPending}
            >
              Yes, Cancel Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => {
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        }}
        title="Remove Member"
        subtitle="Are you sure you want to remove this member?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {memberToRemove && (
              <>
                <strong>{memberToRemove.name}</strong>
                {memberToRemove.email && ` (${memberToRemove.email})`} will be removed from the organization.
              </>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveMemberModalOpen(false);
                setMemberToRemove(null);
              }}
            >
              No, Keep Member
            </Button>
            <Button
              onClick={confirmRemoveMember}
              loading={removeMemberMutation.isPending}
              disabled={removeMemberMutation.isPending}
            >
              Yes, Remove Member
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dev-only Delete Organization Modal */}
      <Modal
        isOpen={isDeleteOrgModalOpen}
        onClose={() => setIsDeleteOrgModalOpen(false)}
        title="Delete Organization"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOrgModalOpen(false)}
              disabled={deleteOrgMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteOrgMutation.mutate()}
              loading={deleteOrgMutation.isPending}
              disabled={deleteOrgMutation.isPending}
            >
              Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
