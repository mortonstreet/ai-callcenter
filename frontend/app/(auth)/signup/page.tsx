"use client";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUpEmail } from "@/hooks/api/useAuth";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get invitation ID and email from query params
  const inviteId = searchParams.get("inviteId");
  const emailParam = searchParams.get("email");

  const [name,setName]=useState("");
  const [email,setEmail]=useState(emailParam || "");
  const [pw,setPw]=useState("");
  const [confirm,setConfirm]=useState("");
  
  const signUpMutation = useSignUpEmail();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pw || !name) return toast.error("Please fill in all fields.");
    if (pw !== confirm) return toast.error("Passwords do not match.");
    
    if (pw.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    
    // Build callback URL with invitation params if they exist
    let callbackURL = `${window.location.origin}/verify`;
    if (inviteId) {
      callbackURL += `?inviteId=${inviteId}`;
    }

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
            // Store invitation info if it exists
            if (inviteId) {
              localStorage.setItem("pendingInvitation", JSON.stringify({ inviteId }));
            }
            toast.success("Account created! Check your email to verify.");
            router.push(inviteId ? `/verify?inviteId=${inviteId}` : "/verify");
          }
        },
        onError: () => {
          toast.error("An error occurred. Please try again.");
        },
      }
    );
  }

  // In production, enforce invite-only UI unless an invite is present.
  // In development, always show the signup form so local testing is easy.
  if (process.env.NODE_ENV === "production" && !inviteId) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <AuthCard title="Invite Only">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              This platform is currently invite-only. Please contact an administrator to request access.
            </p>
            <a href="/login" className="text-[var(--color-primary)] underline">
              Already have an account? Sign in
            </a>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <AuthCard title="Create your account">
        {inviteId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Please sign up before accepting the invitation.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Name" value={name} onChange={e=>setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={!!emailParam} />
          <Input label="Password" type={"password"} value={pw} onChange={e=>setPw(e.target.value)} required />
          <Input label="Confirm password" type={"password"} value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          <Button type="submit" loading={signUpMutation.isPending} className="w-full">Create account</Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <a 
              className="text-(--color-primary) underline" 
              href={inviteId ? `/login?inviteId=${inviteId}&redirect=${encodeURIComponent(`/accept-invitation/${inviteId}`)}` : "/login"}
            >
              Sign in
            </a>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
