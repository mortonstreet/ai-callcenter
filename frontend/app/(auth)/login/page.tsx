"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignInEmail } from "@/hooks/api/useAuth";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [imageError, setImageError] = useState(false);
  
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
    <div className="h-screen w-screen overflow-hidden fixed inset-0 flex bg-white">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 sm:px-12 lg:px-16 xl:px-24">
        {/* Form Container */}
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-[#1b191a] mb-8">Sign in</h1>

            {inviteId && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Please sign in before accepting the invitation.
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#1b191a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b191a]/20 focus:border-[#1b191a] transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#1b191a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b191a]/20 focus:border-[#1b191a] transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={signInMutation.isPending}
                className="w-full py-3 bg-[#1b191a] text-white font-medium rounded-lg hover:bg-[#2d2a2b] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signInMutation.isPending ? "Signing in..." : "Login"}
              </button>
            </form>

          </div>
        </div>
      </div>

      {/* Right Side - Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#f5f5f7] items-center justify-center">
        <div className="flex items-center gap-4">
          {!imageError ? (
            <Image
              src="/revcenter-logo.svg"
              alt="RevCenter"
              width={280}
              height={80}
              onError={() => setImageError(true)}
              priority
            />
          ) : (
            <span className="text-4xl font-black tracking-tight text-[#1b191a]">
              RevCenter
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
