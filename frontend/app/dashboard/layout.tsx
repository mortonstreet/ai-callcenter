// app/dashboard/layout.tsx
"use client";
import Sidebar from "@/components/dashboard/Sidebar";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  useOrganizations,
} from "@/hooks/api/useOrganization";
import CreateOrganizationModal from "@/components/organization/CreateOrganizationModal";
import { useActiveOrganization } from "@/lib/auth-client";
import { useAdminStore } from "@/lib/admin-store";
import { XCircle, Clock } from "lucide-react";
import Button from "@/components/ui/Button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalAllowClose, setModalAllowClose] = useState(false);
  const { isLoading: isLoadingOrgs } = useOrganizations();
  const { data: organizations } = useOrganizations();
  const activeOrganization = useActiveOrganization();
  const impersonatedOrg = useAdminStore((s) => s.impersonatedOrg);
  const clearImpersonation = useAdminStore((s) => s.clearImpersonation);

  // Check if user is a platform admin
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  useEffect(() => {
    if (!isPending && !session) {
      toast.error("Please login to access the dashboard");
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Handle organization setup - only show modal for admins
  useEffect(() => {
    if (isPending || !session || isLoadingOrgs) return;

    // No orgs - show create modal only for admins
    if (organizations?.data?.length === 0 && isAdmin) {
      setShowCreateModal(true);
      setModalAllowClose(false);
    } else {
      setShowCreateModal(false);
      setModalAllowClose(false);
    }
  }, [isPending, session, isLoadingOrgs, organizations?.data?.length, activeOrganization, isAdmin]);

  if (isPending) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-500">Loading...</div>
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

  const handleCreateSuccess = () => {
    // No need to invalidate - the store is already updated by the mutation
    setShowCreateModal(false);
  };

  const handleOpenCreateOrg = () => {
    setModalAllowClose(true); // Allow closing when creating additional orgs
    setShowCreateModal(true);
  };

  const hasNoOrganizations = !isLoadingOrgs && organizations?.data?.length === 0;

  // Show invite-required screen for non-admin users without organizations
  if (hasNoOrganizations && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Waiting for Organization Access
          </h1>
          <p className="text-gray-600 mb-8">
            You&apos;ll need an invitation to join an organization. Please contact your administrator or wait for an invitation.
          </p>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          onLogout={handleLogout}
          onOpenCreateOrg={isAdmin ? handleOpenCreateOrg : undefined}
        />
        
        {/* Admin Impersonation Banner */}
        {impersonatedOrg && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white">
            <div className="sm:pl-60 md:pl-64">
              <div className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  <strong>Admin View:</strong> Viewing as member of <strong>{impersonatedOrg.name}</strong>
                </span>
                <button
                  onClick={clearImpersonation}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  <XCircle className="h-4 w-4" />
                  Stop Viewing
                </button>
              </div>
            </div>
          </div>
        )}
        
        <main className={`pt-16 sm:pt-0 sm:pl-60 md:pl-64 px-4 md:px-6 py-6 md:py-8 ${impersonatedOrg ? 'mt-10' : ''}`}>
          <div className="mx-auto max-w-[96rem]">
            {children}
          </div>
        </main>
      </div>

      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={hasNoOrganizations ? () => {} : () => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        allowClose={modalAllowClose}
      />
    </>
  );
}
