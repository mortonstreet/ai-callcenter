"use client";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignInEmail, useSignInSocial } from "@/hooks/api/useAuth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signInMutation = useSignInEmail();
  const socialSignInMutation = useSignInSocial();

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

  async function handleGoogleSignIn() {
    let callbackURL = `${window.location.origin}/dashboard`;
    if (inviteId && redirectUrl) {
      callbackURL = `${window.location.origin}${redirectUrl}`;
    }

    socialSignInMutation.mutate(
      {
        provider: "google",
        callbackURL,
      },
      {
        onError: () => {
          toast.error("Failed to sign in with Google");
        },
      }
    );
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen overflow-hidden">
        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1b191a] heading-serif">
                Welcome back
              </h1>
              <p className="mt-3 text-gray-600">
                Sign in to your account to continue.
              </p>
            </div>

            {inviteId && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
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
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[#1b191a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b191a]/20 focus:border-[#1b191a] transition-all duration-200"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link
                    href="/reset-password"
                    className="text-sm text-gray-500 hover:text-[#1b191a] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-xl text-[#1b191a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b191a]/20 focus:border-[#1b191a] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signInMutation.isPending}
                className="w-full py-3.5 bg-[#1b191a] text-white font-medium rounded-xl shadow-md hover:bg-[#2d2a2b] hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signInMutation.isPending ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-sm text-gray-400">or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={socialSignInMutation.isPending}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {socialSignInMutation.isPending ? "Signing in..." : "Continue with Google"}
            </button>

            {/* Sign up link */}
            <p className="mt-8 text-center text-sm text-gray-600">
              {inviteId ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/signup?inviteId=${inviteId}`}
                    className="font-medium text-[#1b191a] hover:underline"
                  >
                    Create one
                  </Link>
                </>
              ) : (
                "Need access? Ask your admin to send an invitation."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1b191a] items-center justify-center p-12">
        <div className="max-w-md text-center">
          <img
            src="/revcenter-logo-white.svg"
            alt="RevCenter"
            className="h-6 w-auto mx-auto mb-8"
            style={{ shapeRendering: 'geometricPrecision' }}
          />
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white heading-serif mb-6">
            Automate Your Calls.<br />Book More Revenue.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            AI-powered call handling that qualifies leads, books appointments, and grows your business 24/7.
          </p>
        </div>
      </div>
    </div>
  );
}
