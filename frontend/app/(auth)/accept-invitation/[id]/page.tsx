"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession, signOut, organization } from "@/lib/auth-client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/ui/Button";
import { normalizeAuthError } from "@/lib/auth-errors";

type ValidationState = "checking" | "valid" | "invalid";

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const invitationId = params.id as string;
  const invitedEmailParam = searchParams.get("email");

  const [isAccepting, setIsAccepting] = useState(false);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>("checking");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      setRedirectingToLogin(true);
      const qs = new URLSearchParams();
      qs.set("inviteId", invitationId);
      if (invitedEmailParam) {
        qs.set("email", invitedEmailParam);
      }
      router.push(`/login?${qs.toString()}`);
    }
  }, [session, isPending, invitationId, invitedEmailParam, router]);

  useEffect(() => {
    if (!session || isPending) return;

    let mounted = true;
    const validateInvitation = async () => {
      setValidationState("checking");
      setValidationError(null);

      try {
        const result: any = await organization.getInvitation({
          query: { id: invitationId },
        });
        if (result?.error) {
          const normalized = normalizeAuthError(result.error);
          if (!mounted) return;
          setValidationState("invalid");
          setValidationError(normalized.userMessage);
          return;
        }

        const invitation = result?.data ?? result;
        const invitationEmail = String(
          invitation?.email || invitedEmailParam || "",
        ).toLowerCase();
        const sessionEmail = String(session.user.email || "").toLowerCase();

        if (!invitationEmail) {
          if (!mounted) return;
          setValidationState("invalid");
          setValidationError("This invitation is invalid or missing an email.");
          return;
        }

        if (invitationEmail !== sessionEmail) {
          if (!mounted) return;
          const normalized = normalizeAuthError({
            code: "AUTH_INVITE_EMAIL_MISMATCH",
          });
          setValidationState("invalid");
          setValidationError(normalized.userMessage);
          return;
        }

        if (!mounted) return;
        setValidationState("valid");
      } catch (error) {
        if (!mounted) return;
        const normalized = normalizeAuthError(error);
        setValidationState("invalid");
        setValidationError(normalized.userMessage);
      }
    };

    validateInvitation();
    return () => {
      mounted = false;
    };
  }, [invitationId, invitedEmailParam, isPending, session]);

  const handleAcceptInvitation = async () => {
    if (!invitationId) {
      toast.error("Invalid invitation link");
      return;
    }
    if (validationState !== "valid") {
      toast.error(validationError || "Invitation validation failed");
      return;
    }

    setIsAccepting(true);
    try {
      const result: any = await organization.acceptInvitation({ invitationId });
      if (result?.error) {
        const normalized = normalizeAuthError(result.error);
        toast.error(normalized.userMessage);
        return;
      }

      setInvitationAccepted(true);
      toast.success("Invitation accepted successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (error) {
      const normalized = normalizeAuthError(error);
      toast.error(normalized.userMessage);
    } finally {
      setIsAccepting(false);
    }
  };

  const mismatchActionLabel = useMemo(() => {
    if (!invitedEmailParam) return "Use a different account";
    return `Sign in as ${invitedEmailParam}`;
  }, [invitedEmailParam]);

  const handleSwitchAccount = async () => {
    await signOut();
    const qs = new URLSearchParams();
    qs.set("inviteId", invitationId);
    if (invitedEmailParam) {
      qs.set("email", invitedEmailParam);
    }
    router.push(`/login?${qs.toString()}`);
  };

  if (isPending || validationState === "checking") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-gray-500">Validating invitation...</div>
      </div>
    );
  }

  if (!session || redirectingToLogin) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-gray-500">Redirecting to sign in...</div>
      </div>
    );
  }

  if (validationState === "invalid") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <AuthCard title="Invitation error">
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              {validationError || "This invitation is not valid for your account."}
            </p>
            <Button className="w-full" onClick={handleSwitchAccount}>
              {mismatchActionLabel}
            </Button>
          </div>
        </AuthCard>
      </div>
    );
  }

  if (invitationAccepted) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <AuthCard title="Success!">
          <div className="text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <p className="text-gray-600">
              You&apos;ve successfully joined the organization.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <AuthCard title="Accept Invitation">
        <div className="space-y-6">
          <p className="text-center text-gray-600">
            You&apos;re invited to join an organization on RevCenter.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvitation}
              loading={isAccepting}
              disabled={isAccepting}
              className="w-full"
            >
              Accept Invitation
            </Button>

            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              disabled={isAccepting}
              className="w-full"
            >
              Decline
            </Button>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
