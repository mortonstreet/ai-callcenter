"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSignInMagicLink, useSignInSocial } from "@/hooks/api/useAuth";
import { buildAuthCallbackUrls } from "@/lib/auth-callback";
import { normalizeAuthError, normalizeAuthErrorFromQuery } from "@/lib/auth-errors";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");
  const inviteEmail = searchParams.get("email");

  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail || "");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const magicLinkMutation = useSignInMagicLink();
  const socialSignInMutation = useSignInSocial();

  useEffect(() => {
    const fromQuery = normalizeAuthErrorFromQuery(new URLSearchParams(searchParams.toString()));
    if (!fromQuery) return;
    toast.error(fromQuery.userMessage);
  }, [searchParams]);

  const callbacks = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return buildAuthCallbackUrls({
      origin: window.location.origin,
      inviteId,
      inviteEmail,
    });
  }, [inviteEmail, inviteId]);

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }
    if (!callbacks) return;

    magicLinkMutation.mutate(
      {
        email,
        name: name.trim() || undefined,
        callbackURL: callbacks.callbackURL,
        newUserCallbackURL: callbacks.newUserCallbackURL,
        errorCallbackURL: callbacks.errorCallbackURL,
      },
      {
        onSuccess: (result: any) => {
          if (result?.error) {
            const normalized = normalizeAuthError(result.error);
            toast.error(normalized.userMessage);
            return;
          }
          setSentTo(email);
          toast.success("Magic link sent. Check your inbox.");
        },
        onError: (error: any) => {
          const normalized = normalizeAuthError(error);
          toast.error(normalized.userMessage);
        },
      },
    );
  };

  const handleGoogleSignUp = () => {
    if (!callbacks) return;

    socialSignInMutation.mutate(
      {
        provider: "google",
        callbackURL: callbacks.callbackURL,
        newUserCallbackURL: callbacks.newUserCallbackURL,
        errorCallbackURL: callbacks.errorCallbackURL,
      },
      {
        onError: (error: any) => {
          const normalized = normalizeAuthError(error);
          toast.error(normalized.userMessage);
        },
      },
    );
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-3xl font-light tracking-tight text-[#1b191a] heading-serif">
            Create your account
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Start with magic link sign-in. No password required.
          </p>
        </div>

        {inviteId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Use the invited email address to join your organization.
          </div>
        )}

        {sentTo && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            Magic link sent to <strong>{sentTo}</strong>.
          </div>
        )}

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[#1b191a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b191a]/20 focus:border-[#1b191a] transition-all duration-200"
            />
          </div>

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

          <button
            type="submit"
            disabled={magicLinkMutation.isPending}
            className="w-full py-3.5 bg-[#1b191a] text-white font-medium rounded-xl shadow-md hover:bg-[#2d2a2b] hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {magicLinkMutation.isPending ? "Sending link..." : "Send magic link"}
          </button>
        </form>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-sm text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={socialSignInMutation.isPending}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {socialSignInMutation.isPending ? "Signing in..." : "Continue with Google"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={
              inviteId
                ? `/login?inviteId=${encodeURIComponent(inviteId)}${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ""}`
                : "/login"
            }
            className="font-medium text-[#1b191a] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

