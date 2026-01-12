import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins"
import { env } from "./config";

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
  ],
  baseURL: env.API_URL.toString() + "/auth",
  fetchOptions: {
    credentials: "include",
  }
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  sendVerificationEmail,
  organization,
  useActiveOrganization,
} = authClient;
