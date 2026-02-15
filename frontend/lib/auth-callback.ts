type AuthCallbackContext = {
  origin: string;
  inviteId?: string | null;
  inviteEmail?: string | null;
};

const invitePath = (inviteId: string, inviteEmail?: string | null) => {
  const encodedId = encodeURIComponent(inviteId);
  if (!inviteEmail) {
    return `/accept-invitation/${encodedId}`;
  }
  return `/accept-invitation/${encodedId}?email=${encodeURIComponent(inviteEmail)}`;
};

export const buildAuthCallbackUrls = ({ origin, inviteId, inviteEmail }: AuthCallbackContext) => {
  if (inviteId) {
    const targetPath = invitePath(inviteId, inviteEmail);
    const target = `${origin}${targetPath}`;
    return {
      callbackURL: target,
      newUserCallbackURL: target,
      // Better Auth appends `?error=...` to this URL on failure; keep this query-free.
      errorCallbackURL: `${origin}/login`,
    };
  }

  return {
    callbackURL: `${origin}/dashboard`,
    newUserCallbackURL: `${origin}/onboarding`,
    // Better Auth appends `?error=...` to this URL on failure; keep this query-free.
    errorCallbackURL: `${origin}/login`,
  };
};

