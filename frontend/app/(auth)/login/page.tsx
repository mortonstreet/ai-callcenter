"use client";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignInEmail } from "@/hooks/api/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  
  const signInMutation = useSignInEmail();

  // Get invitation ID and redirect URL from query params
  const inviteId = searchParams.get("inviteId");
  const redirectUrl = searchParams.get("redirect");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pw) return toast.error("Please fill in all fields.");
    
    signInMutation.mutate(
      { email, password: pw },
      {
        onSuccess: (result) => {
          if (result.error) {
            toast.error(result.error.message || "Failed to sign in");
          } else {
            toast.success("Signed in successfully!");
            // Redirect to invitation page if invite token exists, otherwise dashboard
            if (redirectUrl) {
              router.push(redirectUrl);
            } else {
              router.push("/dashboard");
            }
          }
        },
        onError: () => {
          toast.error("An error occurred. Please try again.");
        },
      }
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <AuthCard title="Welcome back">
        {inviteId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Please sign in before accepting the invitation.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <div className="space-y-2">
            <Input label="Password" type={"password"} value={pw} onChange={e=>setPw(e.target.value)} required />
            <div className="text-right">
              <a href="/reset-password" className="text-sm text-[var(--color-primary)] hover:underline">
                Forgot password?
              </a>
            </div>
          </div>
          <Button type="submit" loading={signInMutation.isPending} className="w-full">Sign in</Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            New here?{" "}
            <a 
              className="text-(--color-primary) underline" 
              href={inviteId ? `/signup?inviteId=${inviteId}&redirect=${encodeURIComponent(redirectUrl || "")}` : "/signup"}
            >
              Create an account
            </a>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
