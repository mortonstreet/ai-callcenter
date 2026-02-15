"use client";
import { Suspense, useEffect, useState } from "react";
import AuthCard from "@/components/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUpEmail } from "@/hooks/api/useAuth";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Invite-only signup context.
  const inviteId = (searchParams.get("inviteId") || "").trim();
  const emailParam = searchParams.get("email");
  const hasInviteContext = inviteId.length > 0;

  const [name,setName]=useState("");
  const [email,setEmail]=useState(emailParam || "");
  const [pw,setPw]=useState("");
  const [confirm,setConfirm]=useState("");
  
  const signUpMutation = useSignUpEmail();

  useEffect(() => {
    if (hasInviteContext) return;
    toast.error("Signup requires a valid invitation link.");
    router.replace("/login");
  }, [hasInviteContext, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasInviteContext) {
      return toast.error("Signup requires an invitation.");
    }
    if (!email || !pw || !name) return toast.error("Please fill in all fields.");
    if (pw !== confirm) return toast.error("Passwords do not match.");
    
    if (pw.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    
    // Callback always carries invite context for invite-only auth checks.
    let callbackURL = `${window.location.origin}/verify`;
    callbackURL += `?inviteId=${inviteId}`;

    signUpMutation.mutate(
      {
        email,
        password: pw,
        name,
        callbackURL,
      },
      {
        onSuccess: (result) => {
          if (result.error) {
            toast.error(result.error.message || "Failed to create account");
          } else {
            localStorage.setItem("pendingVerificationEmail", email);
            localStorage.setItem("pendingInvitation", JSON.stringify({ inviteId }));
            toast.success("Account created! Check your email to verify.");
            router.push(`/verify?inviteId=${inviteId}`);
          }
        },
        onError: () => {
          toast.error("An error occurred. Please try again.");
        },
      }
    );
  }

  if (!hasInviteContext) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <AuthCard title="Invitation required">
          <p className="text-sm text-gray-600">Redirecting to login...</p>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <AuthCard title="Create your account">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Please create your account to accept this invitation.
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Name" value={name} onChange={e=>setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input label="Password" type={"password"} value={pw} onChange={e=>setPw(e.target.value)} required />
          <Input label="Confirm password" type={"password"} value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          <Button type="submit" loading={signUpMutation.isPending} className="w-full">Create account</Button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a 
              className="text-(--color-primary) underline" 
              href={`/login?inviteId=${inviteId}&redirect=${encodeURIComponent(`/accept-invitation/${inviteId}`)}`}
            >
              Sign in
            </a>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
