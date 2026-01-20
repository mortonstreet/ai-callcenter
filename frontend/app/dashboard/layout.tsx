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
import { useActiveOrganization } from "@/lib/auth-client";
import { DBUser } from "@/lib/shared-types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { isLoading: isLoadingOrgs, data: organizations } = useOrganizations();
  const activeOrganization = useActiveOrganization();
  const isAdmin = (session?.user as DBUser)?.isAdmin === true;
  
  // Consider loading if either orgs are loading or active org is being determined
  const isLoadingOrgData = isLoadingOrgs || activeOrganization?.isPending;

  useEffect(() => {
    if (!isPending && !session) {
      toast.error("Please login to access the dashboard");
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Handle organization setup
  useEffect(() => {
    if (isPending || !session || isLoadingOrgData) return;

    // Admin users don't need to create an organization - they can view all orgs
    if (isAdmin) return;

    // If user already has an active organization, don't show modal
    if (activeOrganization?.data?.id) return;

    // No orgs - send to onboarding
    if (organizations?.data?.length === 0) {
      router.push("/onboarding");
    }
  }, [isPending, session, isLoadingOrgData, organizations?.data?.length, activeOrganization?.data?.id, isAdmin, router]);

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

  const handleOpenCreateOrg = () => {
    router.push("/onboarding");
  };

  return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar onLogout={handleLogout} onOpenCreateOrg={handleOpenCreateOrg} />
        
        <main className="pt-16 sm:pt-0 sm:pl-60 md:pl-64 px-4 md:px-6 py-6 md:py-8">
          <div className="mx-auto max-w-[96rem]">
            {children}
          </div>
        </main>
      </div>
  );
}
