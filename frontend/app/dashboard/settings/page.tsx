/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState } from "react";
import Image from "next/image";
import { Page } from "@/components/dashboard/Page";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useInviteMember, useListOrganizationMembers, useListOrganizationInvitations, useCancelOrganizationInvitation, useRemoveOrganizationMember } from "@/hooks/api/useOrganization";
import { useHasPasswordAuth } from "@/hooks/api/useUser";
import { useChangePassword } from "@/hooks/api/useAuth";
import { useEffectiveOrganization, useAdminStore } from "@/lib/admin-store";
import { useCreateCheckoutSession, useOrganizationSubscription, useCreatePortalSession } from "@/hooks/api/useStripe";
import { STRIPE_PLANS } from "@shared/types/src";

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
  
  // Stripe
  const createCheckoutSession = useCreateCheckoutSession();
  const createPortalSession = useCreatePortalSession();
  const { data: subscription, isLoading: subscriptionLoading } = useOrganizationSubscription(effectiveOrganization?.id);

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

  // Check if current user is admin
  const currentUserMember = members.find((m: any) => m.userId === user?.id);
  const isAdmin = currentUserMember?.role === "admin";
  const isOwner = currentUserMember?.role === "owner";

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

  const handleUpgrade = async () => {
    if (!effectiveOrganization) {
      toast.error("No active organization");
      return;
    }

    const proPlan = STRIPE_PLANS[0];
    createCheckoutSession.mutate(
      { planName: proPlan.name, organizationId: effectiveOrganization.id },
      {
        onSuccess: (data: any) => {
          if (data?.error) {
            toast.error(data.error.message || "Failed to create checkout session");
          } else if (data?.data?.url) {
            window.location.href = data.data.url;
          }
        },
        onError: () => {
          toast.error("Failed to start checkout");
        },
      }
    );
  };

  const handleManageBilling = async () => {
    if (!effectiveOrganization) {
      toast.error("No active organization");
      return;
    }

    createPortalSession.mutate(
      { organizationId: effectiveOrganization.id },
      {
        onSuccess: (data: any) => {
          if (data?.error) {
            toast.error(data.error.message || "Failed to open billing portal");
          } else if (data?.data?.url) {
            window.location.href = data.data.url;
          }
        },
        onError: () => {
          toast.error("Failed to open billing portal");
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
              <h3 className="text-sm font-semibold text-gray-900">Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <p className="text-gray-900">{user?.name || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{user?.email || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Change Password - Only for email/password users */}
            {hasPasswordAuth && (
              <>
                <div className="border-t border-gray-200" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
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

            {/* Billing - Only for admin/owner */}
            {(isAdmin || isOwner) && (
              <>
                <div className="border-t border-gray-200" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Billing</h3>
                  {subscriptionLoading ? (
                    <div className="text-sm text-gray-500">Loading subscription...</div>
                  ) : subscription ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-primary)]/10 rounded-xl border border-[var(--color-primary)]/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">You are subscribed to Pro</p>
                            <p className="text-sm text-gray-600">
                              {subscription.status === "active" ? "Active" : subscription.status}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={handleManageBilling}
                          loading={createPortalSession.isPending}
                          disabled={createPortalSession.isPending}
                        >
                          Manage Billing
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-primary)]/20">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">Currently on: Free Plan</p>
                          <p className="text-sm text-[var(--color-primary)]">
                            Contact your sales rep to upgrade to Pro
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
                <h3 className="text-sm font-semibold text-gray-900">Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name
                    </label>
                    <p className="text-gray-900">{effectiveOrganization.name}</p>
                  </div>
                </div>
              </div>


              {/* Members Section */}
              <div className="space-y-4">
                {/* Invite New Member (Admin Only) */}
                {(isAdmin || isOwner) && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Invite New Member</h3>
                      {impersonatedOrg ? (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
                          <p className="text-sm text-purple-700">
                            To invite members to <strong>{impersonatedOrg.name}</strong>, use the Admin Dashboard.
                          </p>
                        </div>
                      ) : (
                      <form onSubmit={handleInviteMember} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              placeholder="Enter email address"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              required
                              className="w-full h-[38px] rounded-xl border border-gray-300 px-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-black placeholder:text-gray-400"
                            />
                          </div>
                          <Dropdown
                            trigger={
                              <button
                                type="button"
                                className="flex items-center justify-between w-[120px] h-[38px] px-4 border-[0.5px] border-gray-300 rounded-xl text-sm font-medium text-neutral-600 hover:bg-gray-50 active:bg-gray-100 active:text-black cursor-pointer shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]"
                              >
                                <span>
                                  {inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)}
                                </span>
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            }
                          >
                            <DropdownItem
                              onClick={() => setInviteRole("member")}
                              active={inviteRole === "member"}
                            >
                              Member
                            </DropdownItem>
                          </Dropdown>
                          <Button type="submit" className="h-[38px] px-8" loading={inviteMemberMutation.isPending} disabled={inviteMemberMutation.isPending}>
                            Invite
                          </Button>
                        </div>
                      </form>
                      )}
                    </div>
                  </>
                )}

                {/* Members List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Members ({members.length})
                  </h3>
                  {membersLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading members...</div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No members yet</div>
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
                            className="flex items-center justify-between p-4 bg-white border-[0.5px] border-gray-300 rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center overflow-hidden">
                                {avatarImage ? (
                                  <Image
                                    src={avatarImage}
                                    alt={memberName}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-semibold">
                                    {avatarFallback}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{memberName}</p>
                                <p className="text-sm text-gray-500">{memberEmail}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={member.role === "admin" || member.role === "owner" ? "primary" : "gray"}>
                                {member.role}
                              </Badge>
                              {(isAdmin || isOwner) && (
                                <button
                                  onClick={() => handleRemoveMember(member)}
                                  disabled={member.role === "admin" || member.role === "owner" || member.userId === user?.id}
                                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl cursor-pointer disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                  aria-label="Remove member"
                                >
                                  Remove
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
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Pending Invitations ({invitations.length})
                      </h3>
                      {invitationsLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading invitations...</div>
                      ) : (
                        <div className="space-y-2">
                          {invitations.map((invitation: any) => {
                            const inviteeEmail = invitation.email;
                            const avatar = inviteeEmail.charAt(0).toUpperCase();
                            
                            return (
                              <div
                                key={invitation.id}
                                className="flex items-center justify-between p-4 bg-white border-[0.5px] border-gray-300 rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-600 font-semibold">
                                      {avatar}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{inviteeEmail}</p>
                                    <p className="text-sm text-gray-500">Invited • Pending acceptance</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="yellow">
                                    {invitation.role}
                                  </Badge>
                                  {(isAdmin || isOwner) && (
                                    <button
                                      onClick={() => handleCancelInvitation(invitation.id)}
                                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl cursor-pointer"
                                      aria-label="Cancel invitation"
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
                )}
              </div>
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
          <p className="text-sm text-gray-600">
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
          <p className="text-sm text-gray-600">
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
    </Page>
  );
}
